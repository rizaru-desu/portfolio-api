import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AccountLockoutService {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private mailerService: MailerService,
  ) {}

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(
    identifier: string,
    ipAddress?: string,
  ): Promise<void> {
    const maxAttempts = this.configService.get<number>('lockout.maxAttempts')!;
    const lockoutMinutes = this.configService.get<number>(
      'lockout.lockoutMinutes',
    )!;

    // Increment attempt counter for identifier
    const identifierKey = `lockout:user:${identifier}`;
    const attempts = await this.redisService.get(identifierKey);
    const newAttempts = attempts ? parseInt(attempts) + 1 : 1;

    // Store with 15-minute TTL
    await this.redisService.set(
      identifierKey,
      newAttempts.toString(),
      lockoutMinutes * 60,
    );

    // Also track by IP
    if (ipAddress) {
      const ipKey = `lockout:ip:${ipAddress}`;
      const ipAttempts = await this.redisService.get(ipKey);
      const newIpAttempts = ipAttempts ? parseInt(ipAttempts) + 1 : 1;
      await this.redisService.set(
        ipKey,
        newIpAttempts.toString(),
        lockoutMinutes * 60,
      );
    }

    // Lock account if threshold reached
    if (newAttempts >= maxAttempts) {
      await this.lockAccount(identifier, lockoutMinutes);
    }
  }

  /**
   * Check if account is locked
   */
  async checkLockout(identifier: string): Promise<void> {
    const lockKey = `lockout:locked:${identifier}`;
    const locked = await this.redisService.get(lockKey);

    if (locked) {
      const ttl = await this.redisService.ttl(lockKey);
      const minutesLeft = Math.ceil(ttl / 60);
      throw new Error(
        `Account is temporarily locked. Try again in ${minutesLeft} minutes.`,
      );
    }
  }

  /**
   * Lock account
   */
  async lockAccount(
    identifier: string,
    durationMinutes: number,
    userEmail?: string,
    userName?: string,
  ): Promise<void> {
    const lockKey = `lockout:locked:${identifier}`;

    // Set lock with expiration
    await this.redisService.set(lockKey, 'locked', durationMinutes * 60);

    // Send security alert email if email provided
    if (userEmail && userName) {
      const unlockTime = new Date();
      unlockTime.setMinutes(unlockTime.getMinutes() + durationMinutes);

      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'Account Temporarily Locked',
        template: 'account-locked',
        context: {
          name: userName,
          lockoutMinutes: durationMinutes,
          unlockTime: unlockTime.toLocaleString(),
        },
      });
    }
  }

  /**
   * Reset attempts after successful login
   */
  async resetAttempts(identifier: string, ipAddress?: string): Promise<void> {
    await this.redisService.del(`lockout:user:${identifier}`);

    if (ipAddress) {
      await this.redisService.del(`lockout:ip:${ipAddress}`);
    }
  }

  /**
   * Manually unlock account (admin function)
   */
  async unlockAccount(identifier: string): Promise<void> {
    await this.redisService.del(`lockout:locked:${identifier}`);
    await this.redisService.del(`lockout:user:${identifier}`);
  }

  /**
   * Get remaining lockout time
   */
  async getLockoutInfo(identifier: string): Promise<{
    isLocked: boolean;
    remainingMinutes?: number;
    attempts?: number;
  }> {
    const lockKey = `lockout:locked:${identifier}`;
    const attemptKey = `lockout:user:${identifier}`;

    const locked = await this.redisService.get(lockKey);
    const attempts = await this.redisService.get(attemptKey);

    if (locked) {
      const ttl = await this.redisService.ttl(lockKey);
      return {
        isLocked: true,
        remainingMinutes: Math.ceil(ttl / 60),
      };
    }

    return {
      isLocked: false,
      attempts: attempts ? parseInt(attempts) : 0,
    };
  }
}
