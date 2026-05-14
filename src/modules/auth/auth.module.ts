import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TermsService } from './terms.service';
import { ApiClientModule } from '@modules/shared/api-client/api-client.module';

@Module({
  imports: [ConfigModule, ApiClientModule],
  controllers: [AuthController],
  providers: [AuthService, TermsService],
  exports: [AuthService, TermsService],
})
export class AuthModule {}
