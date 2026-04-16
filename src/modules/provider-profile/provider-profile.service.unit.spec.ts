import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { ProviderProfileService } from './provider-profile.service';

const PROVIDER_ID = 'prov-1';
const HEADERS = { 'x-user-id': 'user-1' };

const makeApi = () => ({ get: jest.fn() });
const makeCache = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
});

const rawProvider = {
  id: PROVIDER_ID,
  business_name: 'Clean Pro',
  description: 'Professional cleaning',
  average_rating: 4.8,
  review_count: 120,
  is_available: true,
  verification_status: 'VERIFIED',
  services: [
    { id: 's1', name: 'Limpeza', category: { id: 'c1', name: 'Limpeza' }, price_base: 150, price_type: 'FIXED' },
  ],
  work_locations: [{ city: 'São Paulo', state: 'SP', is_primary: true }],
};

const rawReviews = {
  data: [
    {
      rating: 5,
      comment: 'Excelente!',
      contractor_name: 'João',
      service_name: 'Limpeza',
      created_at: '2026-04-01T00:00:00.000Z',
    },
  ],
};

describe('ProviderProfileService', () => {
  let service: ProviderProfileService;
  let api: ReturnType<typeof makeApi>;
  let cache: ReturnType<typeof makeCache>;

  beforeEach(async () => {
    api = makeApi();
    cache = makeCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderProfileService,
        { provide: API_CLIENT_SERVICE, useValue: api },
        { provide: BFF_CACHE_SERVICE, useValue: cache },
      ],
    }).compile();

    service = module.get(ProviderProfileService);
  });

  it('returns cached profile if available', async () => {
    const cached = { id: PROVIDER_ID, businessName: 'Clean Pro' } as any;
    cache.get.mockResolvedValue(cached);
    const result = await service.getProfile({ providerId: PROVIDER_ID, headers: HEADERS });
    expect(result).toBe(cached);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('aggregates provider data and reviews', async () => {
    api.get.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('/providers/')) return Promise.resolve(rawProvider);
      return Promise.resolve(rawReviews);
    });

    const result = await service.getProfile({ providerId: PROVIDER_ID, headers: HEADERS });

    expect(result.id).toBe(PROVIDER_ID);
    expect(result.businessName).toBe('Clean Pro');
    expect(result.averageRating).toBe(4.8);
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('Limpeza');
    expect(result.workLocations).toHaveLength(1);
    expect(result.workLocations[0].isPrimary).toBe(true);
    expect(result.recentReviews).toHaveLength(1);
    expect(result.recentReviews[0].rating).toBe(5);
  });

  it('caches the assembled profile', async () => {
    api.get.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('/providers/')) return Promise.resolve(rawProvider);
      return Promise.resolve(rawReviews);
    });

    await service.getProfile({ providerId: PROVIDER_ID, headers: HEADERS });

    expect(cache.set).toHaveBeenCalledWith(
      expect.objectContaining({ key: `bff:provider-profile:${PROVIDER_ID}` }),
    );
  });

  it('throws NotFoundException when provider fetch returns null', async () => {
    api.get.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('/providers/')) return Promise.reject(new Error('not found'));
      return Promise.resolve({ data: [] });
    });

    await expect(
      service.getProfile({ providerId: PROVIDER_ID, headers: HEADERS }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns empty recentReviews when reviews fetch fails', async () => {
    api.get.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('/providers/')) return Promise.resolve(rawProvider);
      return Promise.reject(new Error('reviews unavailable'));
    });

    const result = await service.getProfile({ providerId: PROVIDER_ID, headers: HEADERS });
    expect(result.recentReviews).toEqual([]);
  });

  it('maps empty services and workLocations when fields are absent', async () => {
    const bare = { ...rawProvider, services: null, work_locations: undefined };
    api.get.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('/providers/')) return Promise.resolve(bare);
      return Promise.resolve({ data: [] });
    });

    const result = await service.getProfile({ providerId: PROVIDER_ID, headers: HEADERS });
    expect(result.services).toEqual([]);
    expect(result.workLocations).toEqual([]);
  });
});
