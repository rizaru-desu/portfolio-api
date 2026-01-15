export default () => ({
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    url: process.env.REDIS_URL!,
  },
  smtp: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!, 10),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    from: process.env.SMTP_FROM || 'noreply@example.com',
  },
  app: {
    url: process.env.APP_URL!,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  security: {
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  },
  twoFactor: {
    encryptionKey: process.env.ENCRYPTION_KEY!,
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    maxOTPAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10),
    maxResendAttempts: parseInt(process.env.MAX_RESEND_ATTEMPTS || '3', 10),
    lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES || '15', 10),
  },
  email: {
    verification: {
      expiryHours: parseInt(
        process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || '24',
        10,
      ),
      requireVerifiedEmail: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    },
    passwordReset: {
      expiryMinutes: parseInt(
        process.env.PASSWORD_RESET_EXPIRY_MINUTES || '60',
        10,
      ),
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  lockout: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  },
});
