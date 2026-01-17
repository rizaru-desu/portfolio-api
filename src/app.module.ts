import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CaslModule } from './casl/casl.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('smtp.host'),
          port: configService.get<number>('smtp.port'),
          secure: false,
          auth: {
            user: configService.get<string>('smtp.user'),
            pass: configService.get<string>('smtp.pass'),
          },
        },
        defaults: {
          from: configService.get<string>('smtp.from'),
        },
        template: {
          dir: join(__dirname, 'auth', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    CaslModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
