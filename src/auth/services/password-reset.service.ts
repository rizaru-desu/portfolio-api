import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { RedisService } from '../../redis/redis.service';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class PasswordResetService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailerService: MailerService,
    private redisService: RedisService,
  ) {}

  /**
   * Initiate password reset flow
   */
  async initiateReset(email: string): Promise<void> {
    // Check rate limit
    const rateLimitKey = `reset:rate:${email}`;
    const attempts = await this.redisService.get(rateLimitKey);

    if (attempts && parseInt(attempts) >= 3) {
      throw new BadRequestException(
        'Too many password reset requests. Please try again later.',
      );
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { account: true },
    });

    // Don't reveal if user exists (security best practice)
    if (!user || !user.account) {
      // Still increment rate limit to prevent enumeration attacks
      const currentAttempts = attempts ? parseInt(attempts) : 0;
      await this.redisService.set(
        rateLimitKey,
        (currentAttempts + 1).toString(),
        900, // 15 minutes
      );
      return;
    }

    // Generate secure random token
    const tokenString = randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(tokenString);

    // Calculate expiration
    const expiryMinutes = this.configService.get<number>(
      'email.passwordReset.expiryMinutes',
    )!;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Delete any existing password reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Store token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt,
      },
    });

    // Generate reset link
    const frontendUrl = this.configService.get<string>('frontend.url')!;
    const resetLink = `${frontendUrl}/reset-password?token=${tokenString}`;

    // Send email
    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Your Password',
      template: 'reset-password',
      context: {
        name: user.name,
        resetLink,
        expiryMinutes,
      },
    });

    // Increment rate limit counter
    const currentAttempts = attempts ? parseInt(attempts) : 0;
    await this.redisService.set(
      rateLimitKey,
      (currentAttempts + 1).toString(),
      900, // 15 minutes
    );
  }

  /**
   * Validate reset token
   */
  async validateResetToken(tokenString: string): Promise<{
    valid: boolean;
    email?: string;
  }> {
    // Find all valid tokens (not expired, not used)
    const validTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Try to find matching token
    for (const dbToken of validTokens) {
      const isValid = await argon2.verify(dbToken.token, tokenString);
      if (isValid) {
        // Fetch user to get email
        const user = await this.prisma.user.findUnique({
          where: { id: dbToken.userId },
        });

        if (user) {
          // Return masked email
          const email = user.email;
          const [localPart, domain] = email.split('@');
          const maskedEmail = `${localPart[0]}***@${domain}`;

          return {
            valid: true,
            email: maskedEmail,
          };
        }
      }
    }

    return { valid: false };
  }

  /**
   * Reset password with token
   */
  async resetPassword(tokenString: string, newPassword: string): Promise<void> {
    // Find all valid tokens
    const validTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Find matching token
    let matchedToken: (typeof validTokens)[0] | null = null;
    for (const dbToken of validTokens) {
      const isValid = await argon2.verify(dbToken.token, tokenString);
      if (isValid) {
        matchedToken = dbToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword);

    // Update password and mark token as used (in transaction)
    await this.prisma.$transaction([
      // Update password
      this.prisma.account.update({
        where: { userId: matchedToken.userId },
        data: { passwordHash },
      }),
      // Mark token as used
      this.prisma.passwordResetToken.update({
        where: { id: matchedToken.id },
        data: { used: true },
      }),
      // Delete all sessions (force re-login)
      this.prisma.session.deleteMany({
        where: { userId: matchedToken.userId },
      }),
    ]);

    // Clear rate limit
    const user = await this.prisma.user.findUnique({
      where: { id: matchedToken.userId },
    });
    if (user) {
      await this.redisService.del(`reset:rate:${user.email}`);
    }

    // Send confirmation email
    if (user) {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Your Password Has Been Changed',
        template: 'password-changed',
        context: {
          name: user.name,
          timestamp: new Date().toLocaleString(),
          ipAddress: 'Password reset flow',
        },
      });
    }
  }

  /**
   * Clean expired tokens
   */
  async cleanExpiredTokens(): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
