import { IsString, IsNotEmpty, Length } from 'class-validator';

export class Verify2FASetupDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string; // 6-digit verification code
}
