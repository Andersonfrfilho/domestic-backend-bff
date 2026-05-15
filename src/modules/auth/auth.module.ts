import { Module } from '@nestjs/common';

import { ConfigModule } from '@config/config.module';
import { ApiClientModule } from '@modules/shared/api-client/api-client.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TermsService } from './terms.service';

@Module({
  imports: [ConfigModule, ApiClientModule],
  controllers: [AuthController],
  providers: [AuthService, TermsService],
  exports: [AuthService, TermsService],
})
export class AuthModule {}
