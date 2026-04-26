import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentProvider } from '@config/providers/environment.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, EnvironmentProvider],
  exports: [AuthService],
})
export class AuthModule {}
