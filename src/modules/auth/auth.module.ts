import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TermsService } from './terms.service';
import { EnvironmentProvider } from '@config/providers/environment.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, TermsService, EnvironmentProvider],
  exports: [AuthService, TermsService],
})
export class AuthModule {}
