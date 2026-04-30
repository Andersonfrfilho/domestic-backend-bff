import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BffCacheModule } from '@modules/shared/cache/bff-cache.module';

import { NavigationConfig, NavigationConfigSchema } from './schemas/navigation-config.schema';
import { NavigationConfigService } from './navigation-config.service';
import { NAVIGATION_CONFIG_SERVICE } from './navigation-config.token';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NavigationConfig.name, schema: NavigationConfigSchema }]),
    BffCacheModule,
  ],
  providers: [
    {
      provide: NAVIGATION_CONFIG_SERVICE,
      useClass: NavigationConfigService,
    },
  ],
  exports: [NAVIGATION_CONFIG_SERVICE],
})
export class NavigationConfigModule {}
