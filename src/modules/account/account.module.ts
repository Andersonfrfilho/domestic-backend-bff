import { Module } from '@nestjs/common';

import { ApiClientModule } from '@modules/shared/api-client/api-client.module';

import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [ApiClientModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
