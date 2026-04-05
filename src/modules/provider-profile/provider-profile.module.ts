import { Module } from '@nestjs/common';

import { ProviderProfileController } from './provider-profile.controller';
import { ProviderProfileService } from './provider-profile.service';

@Module({
  controllers: [ProviderProfileController],
  providers: [ProviderProfileService],
})
export class ProviderProfileModule {}
