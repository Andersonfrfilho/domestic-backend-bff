import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';

import { ScreensController } from './screens.controller';

const mockConfig = {
  screen_id: 'home',
  version: '1.0',
  is_active: true,
  components: [
    {
      id: 'cats',
      type: 'category_list',
      data_source: 'categories',
      order: 0,
      config: {},
      visible: true,
      action: null,
    },
  ],
};

const mockService = {
  listAll: jest.fn().mockResolvedValue([mockConfig]),
  getActiveScreen: jest.fn().mockResolvedValue(mockConfig),
  upsert: jest.fn().mockResolvedValue(mockConfig),
  deactivate: jest.fn().mockResolvedValue(undefined),
};

describe('ScreensController', () => {
  let controller: ScreensController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreensController],
      providers: [{ provide: SCREEN_CONFIG_SERVICE, useValue: mockService }],
    }).compile();

    controller = module.get(ScreensController);
  });

  describe('listAll', () => {
    it('returns all screen configs', async () => {
      const result = await controller.listAll();
      expect(result).toEqual([mockConfig]);
      expect(mockService.listAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getScreen', () => {
    it('returns active screen config', async () => {
      const result = await controller.getScreen('home');
      expect(result).toEqual(mockConfig);
      expect(mockService.getActiveScreen).toHaveBeenCalledWith('home');
    });

    it('throws NotFoundException when screen config not found', async () => {
      mockService.getActiveScreen.mockResolvedValueOnce(null);
      await expect(controller.getScreen('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertScreen', () => {
    it('upserts screen config with object params', async () => {
      const body = { version: '1.1', components: mockConfig.components };
      const result = await controller.upsertScreen('home', body);
      expect(result).toEqual(mockConfig);
      expect(mockService.upsert).toHaveBeenCalledWith({
        screenId: 'home',
        version: '1.1',
        components: mockConfig.components,
      });
    });
  });

  describe('deactivateScreen', () => {
    it('deactivates screen and returns isActive false', async () => {
      const result = await controller.deactivateScreen('home');
      expect(result).toEqual({ screenId: 'home', isActive: false });
      expect(mockService.deactivate).toHaveBeenCalledWith('home');
    });
  });
});
