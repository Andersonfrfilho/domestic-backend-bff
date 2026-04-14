import { Global, Module } from '@nestjs/common';

import { BffCacheService } from './bff-cache.service';
import { BFF_CACHE_SERVICE } from './bff-cache.token';

@Global()
@Module({
  providers: [
    {
      provide: BFF_CACHE_SERVICE,
      useClass: BffCacheService,
    },
  ],
  exports: [BFF_CACHE_SERVICE],
})
export class BffCacheModule {}
