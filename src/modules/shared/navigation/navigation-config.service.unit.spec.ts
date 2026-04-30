import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { NavigationConfigService, DEFAULT_NAVIGATION } from './navigation-config.service';
import { NavigationConfig } from './schemas/navigation-config.schema';
import { NAVIGATION_CONFIG_SERVICE } from './navigation-config.token';

const mockModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('NavigationConfigService', () => {
  let service: NavigationConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: NAVIGATION_CONFIG_SERVICE, useClass: NavigationConfigService },
        { provide: getModelToken(NavigationConfig.name), useValue: mockModel },
        { provide: BFF_CACHE_SERVICE, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<NavigationConfigService>(NAVIGATION_CONFIG_SERVICE);
  });

  describe('getNavigation', () => {
    it('should return cached navigation when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(DEFAULT_NAVIGATION);

      const result = await service.getNavigation('default');

      expect(result).toEqual(DEFAULT_NAVIGATION);
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it('should return DEFAULT_NAVIGATION when no config in MongoDB for default', async () => {
      mockModel.findOne = jest.fn().mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });

      const result = await service.getNavigation('default');

      expect(result).toEqual(DEFAULT_NAVIGATION);
    });

    it('should fall back to default when screen-specific config not found', async () => {
      let callCount = 0;
      mockModel.findOne = jest.fn().mockImplementation(() => ({
        lean: () => ({
          exec: () => {
            callCount++;
            // First call (home) → null, second call (default) → null
            return Promise.resolve(null);
          },
        }),
      }));

      const result = await service.getNavigation('home');

      expect(result).toEqual(DEFAULT_NAVIGATION);
    });

    it('should map MongoDB document to Navigation interface', async () => {
      const mongoDoc = {
        screen_id: 'default',
        is_active: true,
        tab_bar: {
          visible: true,
          items: [
            {
              id: 'home',
              label: 'Início',
              icon: 'home',
              route: '/home',
              visible: true,
              badge: null,
            },
          ],
        },
        header: {
          title: 'Início',
          show_back: false,
          actions: [{ id: 'filter', icon: 'filter', action: 'open_filters' }],
        },
      };
      mockModel.findOne = jest.fn().mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mongoDoc) }),
      });

      const result = await service.getNavigation('default');

      expect(result).toEqual({
        tabBar: {
          visible: true,
          items: [
            {
              id: 'home',
              label: 'Início',
              icon: 'home',
              route: '/home',
              visible: true,
              badge: null,
            },
          ],
        },
        header: {
          title: 'Início',
          showBack: false,
          actions: [{ id: 'filter', icon: 'filter', action: 'open_filters' }],
        },
      });
    });

    it('should cache navigation after fetching from MongoDB', async () => {
      const mongoDoc = {
        screen_id: 'default',
        is_active: true,
        tab_bar: { visible: true, items: [] },
        header: { title: null, show_back: false, actions: [] },
      };
      mockModel.findOne = jest.fn().mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mongoDoc) }),
      });

      await service.getNavigation('default');

      expect(mockCacheService.set).toHaveBeenCalledWith({
        key: 'bff:navigation:default',
        value: expect.objectContaining({ tabBar: { visible: true, items: [] } }),
        ttlSeconds: 300,
      });
    });
  });

  describe('upsert', () => {
    it('should save navigation config and invalidate cache', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: () => Promise.resolve({}),
      });

      const nav = DEFAULT_NAVIGATION;
      const result = await service.upsert({ screenId: 'default', navigation: nav });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { screen_id: 'default' },
        expect.objectContaining({
          screen_id: 'default',
          is_active: true,
          tab_bar: expect.objectContaining({ visible: true }),
        }),
        { upsert: true, new: true },
      );
      expect(mockCacheService.del).toHaveBeenCalledWith('bff:navigation:default');
      expect(result).toEqual(nav);
    });
  });
});
