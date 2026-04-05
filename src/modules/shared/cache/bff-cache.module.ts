import { Global, Module } from '@nestjs/common';

import { BffCacheService } from './bff-cache.service';

@Global()
@Module({
  providers: [BffCacheService],
  exports: [BffCacheService],
})
export class BffCacheModule {}
