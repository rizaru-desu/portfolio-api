import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TwoFactorType } from '@prisma/client';

export class Disable2FADto {
  @IsString()
  @IsNotEmpty()
  password: string; // Require password confirmation

  @IsEnum(TwoFactorType)
  method: TwoFactorType; // 'TOTP' or 'EMAIL'

  @IsString()
  @IsOptional()
  token?: string; // Optional 2FA token if currently enabled
}
