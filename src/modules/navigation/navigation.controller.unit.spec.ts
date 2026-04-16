import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { NAVIGATION_CONFIG_SERVICE } from '@modules/shared/navigation/navigation-config.token';
import { DEFAULT_NAVIGATION } from '@modules/shared/navigation/navigation-config.service';

import { NavigationController } from './navigation.controller';

const mockConfig = {
  screen_id: 'default',
  is_active: true,
  tab_bar: {
    visible: true,
    items: [{ id: 'home', label: 'Início', icon: 'home', route: '/home', visible: true, badge: null }],
  },
  header: { title: null, show_back: false, actions: [] },
};

const mockService = {
  listAll: jest.fn().mockResolvedValue([mockConfig]),
  findOne: jest.fn().mockResolvedValue(mockConfig),
  upsert: jest.fn().mockResolvedValue(DEFAULT_NAVIGATION),
  deactivate: jest.fn().mockResolvedValue(undefined),
};

describe('NavigationController', () => {
  let controller: NavigationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NavigationController],
      providers: [{ provide: NAVIGATION_CONFIG_SERVICE, useValue: mockService }],
    }).compile();

    controller = module.get<NavigationController>(NavigationController);
  });

  describe('listAll', () => {
    it('should return all navigation configs', async () => {
      const result = await controller.listAll();
      expect(result).toEqual([mockConfig]);
      expect(mockService.listAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNavigation', () => {
    it('should return navigation config for screenId', async () => {
      const result = await controller.getNavigation('default');
      expect(result).toEqual(mockConfig);
      expect(mockService.findOne).toHaveBeenCalledWith('default');
    });

    it('should throw NotFoundException when config not found', async () => {
      mockService.findOne.mockResolvedValueOnce(null);
      await expect(controller.getNavigation('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertNavigation', () => {
    it('should upsert and return navigation', async () => {
      const result = await controller.upsertNavigation('default', DEFAULT_NAVIGATION);
      expect(result).toEqual(DEFAULT_NAVIGATION);
      expect(mockService.upsert).toHaveBeenCalledWith({ screenId: 'default', navigation: DEFAULT_NAVIGATION });
    });
  });

  describe('deactivateNavigation', () => {
    it('should deactivate and return isActive false', async () => {
      const result = await controller.deactivateNavigation('default');
      expect(result).toEqual({ screenId: 'default', isActive: false });
      expect(mockService.deactivate).toHaveBeenCalledWith('default');
    });
  });
});
