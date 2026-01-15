import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyOTPDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string; // 6-digit OTP

  @IsString()
  @IsNotEmpty()
  identifier: string; // email or username
}
