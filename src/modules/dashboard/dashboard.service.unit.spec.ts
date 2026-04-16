import { Test, TestingModule } from '@nestjs/testing';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { DashboardService } from './dashboard.service';

const HEADERS = { 'x-user-id': 'user-1' };

describe('DashboardService', () => {
  let service: DashboardService;
  let api: { get: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    api = { get: jest.fn().mockResolvedValue({ data: [] }) };
    cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: API_CLIENT_SERVICE, useValue: api },
        { provide: BFF_CACHE_SERVICE, useValue: cache },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  describe('getContractorDashboard', () => {
    it('returns cached response', async () => {
      const cached = {
        activeRequests: [],
        pendingRequests: [],
        recentHistory: [],
        unreadNotifications: 0,
      };
      cache.get.mockResolvedValue(cached);
      const result = await service.getContractorDashboard({ userId: 'user-1', headers: HEADERS });
      expect(result).toBe(cached);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('separates active and pending requests', async () => {
      api.get.mockImplementation(({ path }: { path: string }) => {
        if (path.includes('PENDING,ACCEPTED'))
          return Promise.resolve({
            data: [
              { id: 'r1', status: 'ACCEPTED' },
              { id: 'r2', status: 'PENDING' },
            ],
          });
        if (path.includes('unread-count')) return Promise.resolve({ count: 3 });
        return Promise.resolve({ data: [] });
      });

      const result = await service.getContractorDashboard({ userId: 'user-1', headers: HEADERS });
      expect(result.activeRequests).toHaveLength(1);
      expect(result.pendingRequests).toHaveLength(1);
      expect(result.unreadNotifications).toBe(3);
    });
  });

  describe('getProviderDashboard', () => {
    it('returns provider stats from API', async () => {
      api.get.mockImplementation(({ path }: { path: string }) => {
        if (path.includes('/providers/me'))
          return Promise.resolve({
            average_rating: 4.8,
            review_count: 10,
            verification_status: 'APPROVED',
          });
        if (path.includes('unread-count')) return Promise.resolve({ count: 1 });
        return Promise.resolve({ data: [] });
      });

      const result = await service.getProviderDashboard({ userId: 'user-1', headers: HEADERS });
      expect(result.averageRating).toBe(4.8);
      expect(result.verificationStatus).toBe('APPROVED');
    });

    it('falls back to defaults when provider stats fail', async () => {
      api.get.mockRejectedValue(new Error('timeout'));
      const result = await service.getProviderDashboard({ userId: 'user-1', headers: HEADERS });
      expect(result.averageRating).toBe(0);
      expect(result.verificationStatus).toBe('PENDING');
    });
  });
});
