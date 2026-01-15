import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailerService: MailerService,
  ) {}

  /**
   * Generate and send OTP to user's email
   */
  async generateAndSendOTP(userId: string, userEmail: string): Promise<void> {
    // Check rate limit for resends
    const resendKey = `otp:resend:${userId}`;
    const resendCount = await this.redisService.get(resendKey);
    const maxResends = this.configService.get<number>(
      'twoFactor.maxResendAttempts',
    )!;

    if (resendCount && parseInt(resendCount) >= maxResends) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );
    }

    // Generate 6-digit OTP
    const otp = this.generateOTP();

    // Hash the OTP
    const otpHash = await argon2.hash(otp);

    // Get expiry time in minutes
    const expiryMinutes = this.configService.get<number>(
      'twoFactor.otpExpiryMinutes',
    )!;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Delete any existing OTPs for this user
    await this.prisma.emailOTP.deleteMany({
      where: { userId },
    });

    // Store hashed OTP in database
    await this.prisma.emailOTP.create({
      data: {
        userId,
        otpHash,
        expiresAt,
      },
    });

    // Send OTP via email
    await this.sendOTPEmail(userEmail, otp, expiryMinutes);

    // Increment resend counter
    const lockoutMinutes = this.configService.get<number>(
      'twoFactor.lockoutMinutes',
    )!;
    const currentCount = resendCount ? parseInt(resendCount) : 0;
    await this.redisService.set(
      resendKey,
      (currentCount + 1).toString(),
      lockoutMinutes * 60,
    );
  }

  /**
   * Verify OTP
   */
  async verifyOTP(userId: string, otp: string): Promise<boolean> {
    // Check rate limit for verification attempts
    const attemptKey = `otp:attempts:${userId}`;
    const attempts = await this.redisService.get(attemptKey);
    const maxAttempts = this.configService.get<number>(
      'twoFactor.maxOTPAttempts',
    )!;

    if (attempts && parseInt(attempts) >= maxAttempts) {
      throw new UnauthorizedException(
        'Too many verification attempts. Please request a new OTP.',
      );
    }

    // Get the OTP record
    const otpRecord = await this.prisma.emailOTP.findFirst({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP expired or not found');
    }

    // Increment attempt counter
    await this.prisma.emailOTP.update({
      where: { id: otpRecord.id },
      data: {
        attempts: otpRecord.attempts + 1,
      },
    });

    // Verify the OTP
    const isValid = await argon2.verify(otpRecord.otpHash, otp);

    if (!isValid) {
      // Increment Redis attempt counter
      const lockoutMinutes = this.configService.get<number>(
        'twoFactor.lockoutMinutes',
      )!;
      const currentAttempts = attempts ? parseInt(attempts) : 0;
      await this.redisService.set(
        attemptKey,
        (currentAttempts + 1).toString(),
        lockoutMinutes * 60,
      );

      throw new UnauthorizedException('Invalid OTP');
    }

    // Delete the used OTP
    await this.prisma.emailOTP.delete({
      where: { id: otpRecord.id },
    });

    // Clear attempt counters
    await this.redisService.del(attemptKey);
    await this.redisService.del(`otp:resend:${userId}`);

    return true;
  }

  /**
   * Clean up expired OTPs
   */
  async cleanExpiredOTPs(): Promise<void> {
    await this.prisma.emailOTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * Send OTP email
   */
  private async sendOTPEmail(
    email: string,
    otp: string,
    expiryMinutes: number,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your Verification Code',
      template: 'otp-code',
      context: {
        otp,
        expiryMinutes,
      },
    });
  }
}
