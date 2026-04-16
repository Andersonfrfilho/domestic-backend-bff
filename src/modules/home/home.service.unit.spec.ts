import { Test, TestingModule } from '@nestjs/testing';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';

import { HomeService } from './home.service';

const makeApi = () => ({
  get: jest.fn(),
});
const makeCache = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
});
const makeScreen = () => ({
  getActiveScreen: jest.fn().mockResolvedValue(null),
});

describe('HomeService', () => {
  let service: HomeService;
  let api: ReturnType<typeof makeApi>;
  let cache: ReturnType<typeof makeCache>;
  let screen: ReturnType<typeof makeScreen>;

  beforeEach(async () => {
    api = makeApi();
    cache = makeCache();
    screen = makeScreen();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: API_CLIENT_SERVICE, useValue: api },
        { provide: BFF_CACHE_SERVICE, useValue: cache },
        { provide: SCREEN_CONFIG_SERVICE, useValue: screen },
      ],
    }).compile();

    service = module.get(HomeService);
  });

  it('returns cached response if available', async () => {
    const cached = { layout: [], featuredCategories: [], featuredProviders: [] };
    cache.get.mockResolvedValue(cached);
    const result = await service.getHome();
    expect(result).toBe(cached);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('aggregates categories and providers from API', async () => {
    api.get.mockImplementation(({ path }: { path: string }) => {
      if (path.includes('categories')) return Promise.resolve([{ id: 'c1', name: 'Limpeza' }]);
      return Promise.resolve({ data: [{ id: 'p1', business_name: 'Maria Faxina' }] });
    });

    const result = await service.getHome();
    expect(result.featuredCategories).toHaveLength(1);
    expect(result.featuredProviders).toHaveLength(1);
    expect(cache.set).toHaveBeenCalled();
  });

  it('uses screen config layout when available', async () => {
    screen.getActiveScreen.mockResolvedValue({
      components: [
        {
          id: 'cats',
          type: 'category_list',
          data_source: 'categories',
          order: 0,
          config: {},
          visible: true,
        },
      ],
    });
    api.get.mockResolvedValue([]);
    const result = await service.getHome();
    expect(result.layout).toHaveLength(1);
    expect(result.layout[0].type).toBe('category_list');
  });

  it('falls back to default layout when no screen config', async () => {
    api.get.mockResolvedValue([]);
    const result = await service.getHome();
    expect(result.layout.length).toBeGreaterThan(0);
  });

  it('returns empty arrays when API fails', async () => {
    api.get.mockRejectedValue(new Error('timeout'));
    const result = await service.getHome();
    expect(result.featuredCategories).toEqual([]);
    expect(result.featuredProviders).toEqual([]);
  });
});
