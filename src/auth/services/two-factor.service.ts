import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/crypto.util';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { TwoFactorType } from '@prisma/client';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate TOTP secret and QR code for user
   */
  async generateTOTPSecret(userId: string, userEmail: string) {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Portfolio (${userEmail})`,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Encrypt the secret before storing
    const encryptionKey = this.configService.get<string>(
      'twoFactor.encryptionKey',
    )!;
    const encryptedSecret = encrypt(secret.base32, encryptionKey);

    // Store encrypted secret in database (but not enabled yet)
    await this.prisma.twoFactorAuth.upsert({
      where: {
        userId_type: {
          userId,
          type: TwoFactorType.TOTP,
        },
      },
      create: {
        userId,
        type: TwoFactorType.TOTP,
        secret: encryptedSecret,
        enabled: false,
      },
      update: {
        secret: encryptedSecret,
        enabled: false,
      },
    });

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verify TOTP token before enabling
   */
  async verifyTOTPSetup(
    userId: string,
    token: string,
  ): Promise<{ recoveryCodes: string[] }> {
    // Get the TOTP auth record
    const totpAuth = await this.prisma.twoFactorAuth.findUnique({
      where: {
        userId_type: {
          userId,
          type: TwoFactorType.TOTP,
        },
      },
    });

    if (!totpAuth) {
      throw new BadRequestException('2FA setup not initiated');
    }

    // Decrypt the secret
    const encryptionKey = this.configService.get<string>(
      'twoFactor.encryptionKey',
    )!;
    const secret = decrypt(totpAuth.secret, encryptionKey);

    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes(10);
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map((code) => argon2.hash(code)),
    );

    // Enable 2FA and store recovery codes
    await this.prisma.twoFactorAuth.update({
      where: {
        userId_type: {
          userId,
          type: TwoFactorType.TOTP,
        },
      },
      data: {
        enabled: true,
        recoveryCodes: hashedRecoveryCodes,
      },
    });

    return { recoveryCodes };
  }

  /**
   * Verify TOTP token during login
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const totpAuth = await this.prisma.twoFactorAuth.findUnique({
      where: {
        userId_type: {
          userId,
          type: TwoFactorType.TOTP,
        },
      },
    });

    if (!totpAuth || !totpAuth.enabled) {
      return false;
    }

    // Decrypt the secret
    const encryptionKey = this.configService.get<string>(
      'twoFactor.encryptionKey',
    )!;
    const secret = decrypt(totpAuth.secret, encryptionKey);

    // Verify the token
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  /**
   * Enable Email OTP for user
   */
  async enableEmailOTP(userId: string) {
    await this.prisma.twoFactorAuth.upsert({
      where: {
        userId_type: {
          userId,
          type: TwoFactorType.EMAIL,
        },
      },
      create: {
        userId,
        type: TwoFactorType.EMAIL,
        secret: 'email', // Placeholder
        enabled: true,
      },
      update: {
        enabled: true,
      },
    });
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string, type: TwoFactorType) {
    await this.prisma.twoFactorAuth.updateMany({
      where: {
        userId,
        type,
      },
      data: {
        enabled: false,
      },
    });
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(userId: string) {
    const auths = await this.prisma.twoFactorAuth.findMany({
      where: { userId },
    });

    return {
      totp: {
        enabled:
          auths.find((a) => a.type === TwoFactorType.TOTP)?.enabled || false,
      },
      email: {
        enabled:
          auths.find((a) => a.type === TwoFactorType.EMAIL)?.enabled || false,
      },
    };
  }

  /**
   * Verify recovery code
   */
  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const totpAuth = await this.prisma.twoFactorAuth.findUnique({
      where: {
        userId_type: {
          userId,
          type: TwoFactorType.TOTP,
        },
      },
    });

    if (
      !totpAuth ||
      !totpAuth.enabled ||
      !totpAuth.recoveryCodes ||
      !Array.isArray(totpAuth.recoveryCodes)
    ) {
      return false;
    }

    // Check if code matches any recovery code
    const recoveryCodes = totpAuth.recoveryCodes as string[];
    for (const hashedCode of recoveryCodes) {
      const isValid = await argon2.verify(hashedCode, code);
      if (isValid) {
        // Remove the used recovery code
        const updatedCodes = recoveryCodes.filter((c) => c !== hashedCode);
        await this.prisma.twoFactorAuth.update({
          where: {
            userId_type: {
              userId,
              type: TwoFactorType.TOTP,
            },
          },
          data: {
            recoveryCodes: updatedCodes,
          },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Generate random recovery codes
   */
  private generateRecoveryCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
