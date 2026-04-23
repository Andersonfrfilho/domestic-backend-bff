import { Test, TestingModule } from '@nestjs/testing';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';

import { NotificationController } from './notification.controller';

const HEADERS = { 'x-user-id': 'user-1', 'x-forwarded-for': '127.0.0.1' };

const mockApi = {
  get: jest.fn(),
  put: jest.fn(),
};

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: API_CLIENT_SERVICE, useValue: mockApi }],
    }).compile();

    controller = module.get(NotificationController);
  });

  describe('list', () => {
    it('proxies GET /api/v1/notifications with headers', () => {
      const expected = [{ id: 'n1', message: 'Test' }];
      mockApi.get.mockResolvedValue(expected);
      const result = controller.list(HEADERS);
      expect(mockApi.get).toHaveBeenCalledWith({ path: '/v1/notifications', headers: HEADERS });
      expect(result).resolves.toEqual(expected);
    });
  });

  describe('unreadCount', () => {
    it('proxies GET /api/v1/notifications/unread-count', () => {
      mockApi.get.mockResolvedValue({ count: 5 });
      const result = controller.unreadCount(HEADERS);
      expect(mockApi.get).toHaveBeenCalledWith({ path: '/v1/notifications/unread-count', headers: HEADERS });
      expect(result).resolves.toEqual({ count: 5 });
    });
  });

  describe('markRead', () => {
    it('proxies PUT /api/v1/notifications/:id/read', () => {
      mockApi.put.mockResolvedValue({ success: true });
      const result = controller.markRead('notif-1', HEADERS);
      expect(mockApi.put).toHaveBeenCalledWith({
        path: '/v1/notifications/notif-1/read',
        body: {},
        headers: HEADERS,
      });
      expect(result).resolves.toEqual({ success: true });
    });
  });

  describe('markAllRead', () => {
    it('proxies PUT /api/v1/notifications/read-all', () => {
      mockApi.put.mockResolvedValue({ success: true });
      const result = controller.markAllRead({}, HEADERS);
      expect(mockApi.put).toHaveBeenCalledWith({
        path: '/v1/notifications/read-all',
        body: {},
        headers: HEADERS,
      });
      expect(result).resolves.toEqual({ success: true });
    });
  });
});
