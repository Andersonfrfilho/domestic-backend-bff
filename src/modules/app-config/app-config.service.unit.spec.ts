import { Test, TestingModule } from '@nestjs/testing';

import { NAVIGATION_CONFIG_SERVICE } from '@modules/shared/navigation/navigation-config.token';
import { DEFAULT_NAVIGATION } from '@modules/shared/navigation/navigation-config.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { AppConfigService } from './app-config.service';
import { APP_CONFIG_SERVICE } from './app-config.token';

const mockNavigation = DEFAULT_NAVIGATION;

const mockNavigationConfigService = {
  getNavigation: jest.fn().mockResolvedValue(mockNavigation),
};

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: APP_CONFIG_SERVICE, useClass: AppConfigService },
        { provide: NAVIGATION_CONFIG_SERVICE, useValue: mockNavigationConfigService },
        { provide: BFF_CACHE_SERVICE, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AppConfigService>(APP_CONFIG_SERVICE);
  });

  describe('getAppConfig', () => {
    it('should return app config with navigation, features and version', async () => {
      const result = await service.getAppConfig();

      expect(result).toMatchObject({
        navigation: mockNavigation,
        features: {
          chatEnabled: true,
          notificationsEnabled: true,
          reviewsEnabled: true,
          providerSearchEnabled: true,
        },
        version: {
          minRequired: expect.any(String),
          latest: expect.any(String),
          forceUpdate: false,
        },
      });
      expect(mockNavigationConfigService.getNavigation).toHaveBeenCalledWith('default');
    });

    it('should return cached result when available', async () => {
      const cachedConfig = {
        navigation: mockNavigation,
        features: { chatEnabled: false, notificationsEnabled: false, reviewsEnabled: false, providerSearchEnabled: false },
        version: { minRequired: '2.0.0', latest: '2.0.0', forceUpdate: true },
      };
      mockCacheService.get.mockResolvedValueOnce(cachedConfig);

      const result = await service.getAppConfig();

      expect(result).toEqual(cachedConfig);
      expect(mockNavigationConfigService.getNavigation).not.toHaveBeenCalled();
    });

    it('should cache result after fetching', async () => {
      await service.getAppConfig();

      expect(mockCacheService.set).toHaveBeenCalledWith({
        key: 'bff:app-config',
        value: expect.objectContaining({ navigation: mockNavigation }),
        ttlSeconds: 300,
      });
    });
  });
});
