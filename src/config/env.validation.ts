import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsUrl,
  validateSync,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // Database
  @IsString()
  DATABASE_URL: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  // Redis
  @IsString()
  REDIS_URL: string;

  // SMTP
  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number;

  @IsString()
  SMTP_USER: string;

  @IsString()
  SMTP_PASS: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string = 'noreply@example.com';

  // Application
  @IsUrl({ require_tld: false })
  APP_URL: string;

  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  PORT?: number = 3000;

  // Security
  @IsNumber()
  @IsOptional()
  @Min(1)
  RATE_LIMIT_TTL?: number = 60;

  @IsNumber()
  @IsOptional()
  @Min(1)
  RATE_LIMIT_MAX?: number = 10;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
