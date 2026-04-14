import { Module } from '@nestjs/common';

import { ProviderProfileController } from './provider-profile.controller';
import { ProviderProfileService } from './provider-profile.service';
import { PROVIDER_PROFILE_SERVICE } from './provider-profile.token';

@Module({
  controllers: [ProviderProfileController],
  providers: [
    {
      provide: PROVIDER_PROFILE_SERVICE,
      useClass: ProviderProfileService,
    },
  ],
  exports: [PROVIDER_PROFILE_SERVICE],
})
export class ProviderProfileModule {}
