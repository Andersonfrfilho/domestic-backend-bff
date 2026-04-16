import { Module } from '@nestjs/common';

import { BffCacheModule } from '@modules/shared/cache/bff-cache.module';
import { NavigationConfigModule } from '@modules/shared/navigation/navigation-config.module';

import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { APP_CONFIG_SERVICE } from './app-config.token';

@Module({
  imports: [NavigationConfigModule, BffCacheModule],
  controllers: [AppConfigController],
  providers: [
    {
      provide: APP_CONFIG_SERVICE,
      useClass: AppConfigService,
    },
  ],
})
export class AppConfigModule {}
