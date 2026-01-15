import { IsEnum } from 'class-validator';
import { TwoFactorType } from '@prisma/client';

export class Enable2FADto {
  @IsEnum(TwoFactorType)
  method: TwoFactorType; // 'TOTP' or 'EMAIL'
}
