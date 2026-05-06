import { Module } from '@nestjs/common';

import { ApiClientModule } from '@modules/shared/api-client/api-client.module';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [ApiClientModule],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
