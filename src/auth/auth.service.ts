import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TwoFactorService } from './services/two-factor.service';
import { OtpService } from './services/otp.service';
import { AuditLogService } from './services/audit-log.service';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private twoFactorService: TwoFactorService,
    private otpService: OtpService,
    private auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; tokens: any }> {
    // Check if email or username already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const passwordHash = await argon2.hash(dto.password);

    // Create user and account in a transaction
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        email: dto.email,
        image: dto.image,
        role: UserRole.USER, // Default role
        account: {
          create: {
            passwordHash,
          },
        },
      },
      include: {
        account: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    // Return user without account info
    const { account, ...userWithoutAccount } = user;

    return {
      user: userWithoutAccount,
      tokens,
    };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
  ): Promise<
    { user: User; tokens: any } | { requires2FA: true; method: string }
  > {
    // Find user by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
      include: {
        account: true,
        twoFactorAuths: true,
      },
    });

    if (!user || !user.account) {
      // Log failed attempt
      await this.logLoginAttempt(dto.identifier, ipAddress, false);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(
      user.account.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      await this.logLoginAttempt(dto.identifier, ipAddress, false);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    const totpAuth = user.twoFactorAuths.find(
      (auth) => auth.type === 'TOTP' && auth.enabled,
    );
    const emailAuth = user.twoFactorAuths.find(
      (auth) => auth.type === 'EMAIL' && auth.enabled,
    );

    const has2FA = totpAuth || emailAuth;

    // If 2FA is required but token not provided, send challenge
    if (has2FA && !dto.twoFactorToken) {
      // For email OTP, generate and send OTP
      if (emailAuth) {
        await this.otpService.generateAndSendOTP(user.id, user.email);
        return {
          requires2FA: true,
          method: 'email',
        };
      }
      // For TOTP, just return challenge
      return {
        requires2FA: true,
        method: 'google',
      };
    }

    // Verify 2FA if token provided
    if (dto.twoFactorToken && has2FA) {
      let verified = false;

      if (totpAuth) {
        // Try TOTP verification
        verified = await this.twoFactorService.verifyTOTP(
          user.id,
          dto.twoFactorToken,
        );

        // If TOTP fails, try recovery code
        if (!verified) {
          verified = await this.twoFactorService.verifyRecoveryCode(
            user.id,
            dto.twoFactorToken,
          );

          if (verified) {
            // Log recovery code usage
            await this.auditLogService.log({
              userId: user.id,
              action: '2fa_recovery_code_used',
              method: 'recovery',
              success: true,
              ipAddress,
            });
          }
        }
      } else if (emailAuth) {
        // Verify email OTP
        verified = await this.otpService.verifyOTP(user.id, dto.twoFactorToken);
      }

      if (!verified) {
        // Log failed 2FA attempt
        await this.auditLogService.log({
          userId: user.id,
          action: '2fa_verification_failed',
          method: totpAuth ? 'google' : 'email',
          success: false,
          ipAddress,
        });
        throw new UnauthorizedException('Invalid two-factor code');
      }

      // Log successful 2FA verification
      await this.auditLogService.log({
        userId: user.id,
        action: '2fa_verified',
        method: totpAuth ? 'google' : 'email',
        success: true,
        ipAddress,
      });
    }

    // Update last login
    await this.prisma.account.update({
      where: { id: user.account.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful attempt
    await this.logLoginAttempt(dto.identifier, ipAddress, true);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    // Remove sensitive data
    const { account, twoFactorAuths, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<any> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Check if session exists and is valid
      const session = await this.prisma.session.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Invalidate old session and create new one (token rotation)
      await this.prisma.session.delete({
        where: { id: session.id },
      });

      await this.createSession(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Logout specific session
      await this.prisma.session.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Logout all sessions
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }
  }

  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async generateTokens(user: User): Promise<any> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret')!,
        expiresIn: this.configService.get<string>('jwt.expiresIn')! as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret')!,
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
        )! as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn');

    // Calculate expiration date (7 days default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
  }

  private async logLoginAttempt(
    identifier: string,
    ipAddress: string | undefined,
    success: boolean,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        identifier,
        ipAddress,
        success,
      },
    });
  }

  /**
   * Verify user password
   */
  async verifyPassword(userId: string, password: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(account.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }
  }

  /**
   * Find user by email or username
   */
  async findUserByIdentifier(identifier: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }
}
