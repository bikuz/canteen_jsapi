import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(), // Load environment variables from .env file
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Load JWT secret from .env
        signOptions: { expiresIn: configService.get<string>('ACCESS_TOKEN_TIME') }, // Token expiration time
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule],
})
export class SharedModule {}
