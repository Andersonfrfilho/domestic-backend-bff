import { Inject, Injectable, Logger } from '@nestjs/common';

import { NavigationConfigService } from '@modules/shared/navigation/navigation-config.service';
import { NAVIGATION_CONFIG_SERVICE } from '@modules/shared/navigation/navigation-config.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';

import type { AppConfigResponseDto, FeaturesDto, AppVersionDto } from './dtos/app-config-response.dto';

const CACHE_TTL = 300; // 5min

const DEFAULT_FEATURES: FeaturesDto = {
  chatEnabled: true,
  notificationsEnabled: true,
  reviewsEnabled: true,
  providerSearchEnabled: true,
};

const DEFAULT_VERSION: AppVersionDto = {
  minRequired: process.env.APP_MIN_REQUIRED_VERSION ?? '1.0.0',
  latest: process.env.APP_LATEST_VERSION ?? '1.0.0',
  forceUpdate: false,
};

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    @Inject(NAVIGATION_CONFIG_SERVICE)
    private readonly navigationConfig: NavigationConfigService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  async getAppConfig(): Promise<AppConfigResponseDto> {
    const cached = await this.cache.get<AppConfigResponseDto>(CACHE_KEYS.APP_CONFIG);
    if (cached) return cached;

    const navigation = await this.navigationConfig.getNavigation('default');

    const response: AppConfigResponseDto = {
      navigation,
      features: DEFAULT_FEATURES,
      version: DEFAULT_VERSION,
    };

    await this.cache.set({ key: CACHE_KEYS.APP_CONFIG, value: response, ttlSeconds: CACHE_TTL });
    this.logger.log('App config assembled');
    return response;
  }
}
