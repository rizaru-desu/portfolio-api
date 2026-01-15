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
export class EmailVerificationService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailerService: MailerService,
    private redisService: RedisService,
  ) {}

  /**
   * Generate verification token and send email
   */
  async sendVerificationEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    // Check rate limit for resends
    const resendKey = `verify:resend:${email}`;
    const resendCount = await this.redisService.get(resendKey);

    if (resendCount && parseInt(resendCount) >= 3) {
      throw new BadRequestException(
        'Too many verification emails sent. Please try again later.',
      );
    }

    // Generate secure random token
    const tokenString = randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(tokenString);

    // Calculate expiration
    const expiryHours = this.configService.get<number>(
      'email.verification.expiryHours',
    )!;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Delete any existing verification tokens for this user
    await this.prisma.verificationToken.deleteMany({
      where: { userId },
    });

    // Store hashed token in database
    await this.prisma.verificationToken.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
      },
    });

    // Generate verification link
    const frontendUrl = this.configService.get<string>('frontend.url')!;
    const verificationLink = `${frontendUrl}/verify-email?token=${tokenString}`;

    // Send email
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify Your Email Address',
      template: 'verify-email',
      context: {
        name,
        verificationLink,
        expiryHours,
      },
    });

    // Increment resend counter (expires in 1 hour)
    const currentCount = resendCount ? parseInt(resendCount) : 0;
    await this.redisService.set(resendKey, (currentCount + 1).toString(), 3600);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(tokenString: string): Promise<void> {
    // Find all valid verification tokens (not expired)
    const validTokens = await this.prisma.verificationToken.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Try to find matching token by comparing hashes
    let matchedToken: (typeof validTokens)[0] | null = null;
    for (const dbToken of validTokens) {
      const isValid = await argon2.verify(dbToken.token, tokenString);
      if (isValid) {
        matchedToken = dbToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user's emailVerifiedAt
    await this.prisma.user.update({
      where: { id: matchedToken.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    // Delete the used token
    await this.prisma.verificationToken.delete({
      where: { id: matchedToken.id },
    });

    // Clear resend rate limit
    const user = await this.prisma.user.findUnique({
      where: { id: matchedToken.userId },
    });
    if (user) {
      await this.redisService.del(`verify:resend:${user.email}`);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    await this.sendVerificationEmail(user.id, user.email, user.name);
  }

  /**
   * Clean expired tokens (can be called by a cron job)
   */
  async cleanExpiredTokens(): Promise<void> {
    await this.prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
