import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FASetupDto } from './dto/verify-2fa-setup.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { TwoFactorService } from './services/two-factor.service';
import { OtpService } from './services/otp.service';
import { AuditLogService } from './services/audit-log.service';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
    private otpService: OtpService,
    private auditLogService: AuditLogService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, tokens } = await this.authService.register(registerDto);
    this.setCookies(response, tokens.accessToken, tokens.refreshToken);
    return user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const result = await this.authService.login(loginDto, ipAddress);

    if ('requires2FA' in result) {
      return result;
    }

    const { user, tokens } = result;
    this.setCookies(response, tokens.accessToken, tokens.refreshToken);
    return user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setCookies(response, tokens.accessToken, tokens.refreshToken);
    return { message: 'Tokens refreshed' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    await this.authService.logout(user.id, refreshToken);

    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
  }

  private setCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh', // Scope refresh token to refresh endpoint
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  // ==================== 2FA Endpoints ====================

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async enable2FA(
    @CurrentUser() user: any,
    @Body() dto: Enable2FADto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (dto.method === 'TOTP') {
      // Generate TOTP secret and QR code
      const result = await this.twoFactorService.generateTOTPSecret(
        user.id,
        user.email,
      );

      // Log the action
      await this.auditLogService.log({
        userId: user.id,
        action: '2fa_setup_initiated',
        method: 'google',
        success: true,
        ipAddress,
        userAgent,
      });

      return {
        method: 'google',
        qrCode: result.qrCode,
        secret: result.manualEntryKey,
        message:
          'Scan the QR code with Google Authenticator and verify to enable 2FA',
      };
    } else {
      // Enable Email OTP
      await this.twoFactorService.enableEmailOTP(user.id);

      // Log the action
      await this.auditLogService.log({
        userId: user.id,
        action: '2fa_enabled',
        method: 'email',
        success: true,
        ipAddress,
        userAgent,
      });

      return {
        method: 'email',
        message: 'Email OTP has been enabled for your account',
      };
    }
  }

  @Post('2fa/verify-setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify2FASetup(
    @CurrentUser() user: any,
    @Body() dto: Verify2FASetupDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.twoFactorService.verifyTOTPSetup(
      user.id,
      dto.token,
    );

    // Log the action
    await this.auditLogService.log({
      userId: user.id,
      action: '2fa_enabled',
      method: 'google',
      success: true,
      ipAddress,
      userAgent,
    });

    return {
      message: 'Two-Factor Authentication has been enabled successfully',
      recoveryCodes: result.recoveryCodes,
      warning:
        'Save these recovery codes in a safe place. Each code can only be used once.',
    };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disable2FA(
    @CurrentUser() user: any,
    @Body() dto: Disable2FADto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Verify password
    await this.authService.verifyPassword(user.id, dto.password);

    // If token provided, verify it
    if (dto.token) {
      if (dto.method === 'TOTP') {
        const isValid = await this.twoFactorService.verifyTOTP(
          user.id,
          dto.token,
        );
        if (!isValid) {
          throw new UnauthorizedException('Invalid 2FA token');
        }
      } else {
        await this.otpService.verifyOTP(user.id, dto.token);
      }
    }

    // Disable 2FA
    await this.twoFactorService.disable2FA(user.id, dto.method);

    // Log the action
    await this.auditLogService.log({
      userId: user.id,
      action: '2fa_disabled',
      method: dto.method === 'TOTP' ? 'google' : 'email',
      success: true,
      ipAddress,
      userAgent,
    });

    return {
      message: 'Two-Factor Authentication has been disabled',
    };
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  async get2FAStatus(@CurrentUser() user: any) {
    return this.twoFactorService.get2FAStatus(user.id);
  }

  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  async resendOTP(@Body('identifier') identifier: string, @Req() req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    // Find user by email or username
    const user = await this.authService.findUserByIdentifier(identifier);

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the account exists, an OTP has been sent' };
    }

    // Send new OTP
    await this.otpService.generateAndSendOTP(user.id, user.email);

    // Log the action
    await this.auditLogService.log({
      userId: user.id,
      action: '2fa_otp_resent',
      method: 'email',
      success: true,
      ipAddress,
    });

    return { message: 'A new verification code has been sent to your email' };
  }
}
