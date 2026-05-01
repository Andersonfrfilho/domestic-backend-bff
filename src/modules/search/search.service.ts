import * as crypto from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';

import type {
  SearchFilter,
  SearchLayoutComponent,
  SearchProviderItem,
  SearchResponseDto,
} from './dtos/search-response.dto';
import type { SearchRequestDto } from './dtos/search-request.dto';

const DEFAULT_FILTERS: SearchFilter[] = [
  {
    id: 'category',
    label: 'Categoria',
    type: 'select',
    param: 'category_id',
    config: { placeholder: 'Selecione uma categoria' },
  },
  {
    id: 'city',
    label: 'Cidade',
    type: 'select',
    param: 'city',
    config: { placeholder: 'Selecione uma cidade' },
  },
  {
    id: 'rating',
    label: 'Avaliação mínima',
    type: 'range',
    param: 'rating_min',
    config: { min: 1, max: 5, step: 0.5 },
  },
  {
    id: 'available',
    label: 'Disponível agora',
    type: 'boolean',
    param: 'available',
    config: {},
  },
];

const DEFAULT_LAYOUT: SearchLayoutComponent[] = [
  {
    id: 'filter_bar',
    type: 'search_filters',
    order: 0,
    config: { collapsible: true },
    action: null,
  },
  {
    id: 'results',
    type: 'provider_list',
    order: 1,
    config: { show_map: false },
    action: { type: 'navigate', route: '/providers/{id}' },
  },
];

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  return fallback;
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
    @Inject(SCREEN_CONFIG_SERVICE)
    private readonly screenConfig: ScreenConfigService,
  ) {}

  async search(params: SearchRequestDto): Promise<SearchResponseDto> {
    const cacheKey = CACHE_KEYS.SEARCH(this.hashParams(params));
    const cached = await this.cache.get<SearchResponseDto>(cacheKey);
    if (cached) return cached;

    const [apiResult, screenCfgResult] = await Promise.allSettled([
      this.fetchProviders(params),
      this.screenConfig.getActiveScreen('search'),
    ]);

    const apiData = apiResult.status === 'fulfilled' ? apiResult.value : { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const screenCfg = screenCfgResult.status === 'fulfilled' ? screenCfgResult.value : null;

    if (apiResult.status === 'rejected') {
      this.logger.warn(`Search API failed: ${apiResult.reason}`);
    }
    if (screenCfgResult.status === 'rejected') {
      this.logger.warn(`Search screen config failed: ${screenCfgResult.reason}`);
    }

    const layout: SearchLayoutComponent[] = screenCfg
      ? screenCfg.components
          .filter((c) => c.visible)
          .sort((a, b) => a.order - b.order)
          .map((c) => ({
            id: c.id,
            type: c.type,
            order: c.order,
            config: c.config,
            action: c.action ?? null,
          }))
      : DEFAULT_LAYOUT;

    const filters = DEFAULT_FILTERS;

    const response: SearchResponseDto = {
      layout,
      filters,
      data: apiData.data,
      meta: apiData.meta,
      links: { first: null, last: null, next: null, previous: null },
    };

    const ttl = Number(process.env.CACHE_TTL_SEARCH ?? 120);
    await this.cache.set({ key: cacheKey, value: response, ttlSeconds: ttl });

    return response;
  }

  private async fetchProviders(params: SearchRequestDto) {
    const qs = new URLSearchParams();
    const categoryId = params.categoryId ?? params.category_id;
    const ratingMin = params.ratingMin ?? params.rating_min;
    if (categoryId) qs.set('category_id', categoryId);
    if (params.city) qs.set('city', params.city);
    if (params.state) qs.set('state', params.state);
    if (ratingMin !== undefined) qs.set('rating_min', String(ratingMin));
    if (params.available !== undefined) qs.set('available', String(params.available));
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));

    const raw = await this.api.get<Record<string, unknown>[] | { data?: Record<string, unknown>[]; meta?: { total?: number; page?: number; limit?: number } }>({
      path: `/v1/providers?${qs.toString()}`,
    });

    const items: unknown[] = Array.isArray(raw) ? raw : (raw.data ?? []);
    const rawMeta = Array.isArray(raw) ? undefined : raw.meta;

    const data: SearchProviderItem[] = items.map((p) => ({
      id: asString(p['id']),
      businessName: asString(p['business_name'] ?? p['businessName']),
      averageRating: Number(p['average_rating'] ?? p['averageRating'] ?? 0),
      reviewCount: Number(p['review_count'] ?? p['reviewCount'] ?? 0),
      services: Array.isArray(p['services'])
        ? p['services'].map((s) => {
            const svc = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
            return {
              name: asString(svc['name'] ?? svc['service_name'] ?? svc['serviceName']),
              priceBase: Number(svc['price_base'] ?? svc['priceBase'] ?? 0),
              priceType: asString(svc['price_type'] ?? svc['priceType'] ?? 'FIXED'),
            };
          })
        : [],
      workLocations: Array.isArray(p['work_locations'])
        ? p['work_locations'].map((w) => {
            const loc = (typeof w === 'object' && w !== null ? w : {}) as Record<string, unknown>;
            return {
              city: asString(loc['city']),
              state: asString(loc['state']),
            };
          })
        : [],
      city: asString(p['city']),
      state: asString(p['state']),
      latitude: asString(p['latitude']),
      longitude: asString(p['longitude']),
      isAvailable: Boolean(p['is_available'] ?? p['isAvailable'] ?? false),
    }));

    const total = rawMeta?.total ?? data.length;
    const limit = params.limit ?? 20;
    const meta = {
      page: rawMeta?.page ?? params.page ?? 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { data, meta };
  }

  private hashParams(params: SearchRequestDto): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(params as unknown as Record<string, unknown>))
      .digest('hex')
      .slice(0, 12);
  }
}
