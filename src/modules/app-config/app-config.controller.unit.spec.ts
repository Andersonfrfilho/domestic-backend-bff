import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigController } from './app-config.controller';
import { APP_CONFIG_SERVICE } from './app-config.token';
import type { AppConfigResponseDto } from './dtos/app-config-response.dto';

const mockAppConfig: AppConfigResponseDto = {
  navigation: {
    tabBar: {
      visible: true,
      items: [
        { id: 'home', label: 'Início', icon: 'home', route: '/home', visible: true },
        { id: 'search', label: 'Buscar', icon: 'search', route: '/search', visible: true },
      ],
    },
    header: { title: null, showBack: false, actions: [] },
  },
  features: {
    chatEnabled: true,
    notificationsEnabled: true,
    reviewsEnabled: true,
    providerSearchEnabled: true,
  },
  version: { minRequired: '1.0.0', latest: '1.0.0', forceUpdate: false },
};

const mockService = {
  getAppConfig: jest.fn().mockResolvedValue(mockAppConfig),
};

describe('AppConfigController', () => {
  let controller: AppConfigController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppConfigController],
      providers: [{ provide: APP_CONFIG_SERVICE, useValue: mockService }],
    }).compile();

    controller = module.get<AppConfigController>(AppConfigController);
  });

  describe('getAppConfig', () => {
    it('should return app config from service', async () => {
      const result = await controller.getAppConfig();

      expect(result).toEqual(mockAppConfig);
      expect(mockService.getAppConfig).toHaveBeenCalledTimes(1);
    });

    it('should include navigation with tabBar and header', async () => {
      const result = await controller.getAppConfig();

      expect(result.navigation).toBeDefined();
      expect(result.navigation.tabBar).toBeDefined();
      expect(result.navigation.header).toBeDefined();
    });

    it('should include features flags', async () => {
      const result = await controller.getAppConfig();

      expect(result.features.chatEnabled).toBe(true);
      expect(result.features.notificationsEnabled).toBe(true);
    });

    it('should include version info', async () => {
      const result = await controller.getAppConfig();

      expect(result.version.minRequired).toBeDefined();
      expect(result.version.forceUpdate).toBe(false);
    });
  });
});
