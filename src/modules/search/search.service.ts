import * as crypto from 'crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';

import type { SearchFilter, SearchLayoutComponent, SearchProviderItem, SearchResponseDto } from './dtos/search-response.dto';
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
  { id: 'filter_bar', type: 'search_filters', order: 0, config: { collapsible: true } },
  { id: 'results', type: 'provider_list', order: 1, config: { show_map: false } },
];

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
    const cacheKey = `bff:search:${this.hashParams(params)}`;
    const cached = await this.cache.get<SearchResponseDto>(cacheKey);
    if (cached) return cached;

    const [apiResult, screenCfg] = await Promise.all([
      this.fetchProviders(params),
      this.screenConfig.getActiveScreen('search'),
    ]);

    const layout: SearchLayoutComponent[] = screenCfg
      ? screenCfg.components
          .filter((c) => c.visible)
          .sort((a, b) => a.order - b.order)
          .map((c) => ({ id: c.id, type: c.type, order: c.order, config: c.config }))
      : DEFAULT_LAYOUT;

    // Filters podem ser sobrescritos por config no MongoDB futuramente
    const filters = DEFAULT_FILTERS;

    const response: SearchResponseDto = {
      layout,
      filters,
      data: apiResult.data,
      meta: apiResult.meta,
    };

    const ttl = Number(process.env.CACHE_TTL_SEARCH ?? 120);
    await this.cache.set(cacheKey, response, ttl);

    return response;
  }

  private async fetchProviders(params: SearchRequestDto) {
    const qs = new URLSearchParams();
    if (params.category_id) qs.set('category_id', params.category_id);
    if (params.city) qs.set('city', params.city);
    if (params.state) qs.set('state', params.state);
    if (params.rating_min !== undefined) qs.set('rating_min', String(params.rating_min));
    if (params.available !== undefined) qs.set('available', String(params.available));
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));

    try {
      const data = await this.api.get<{
        data?: Record<string, unknown>[];
        meta?: { total?: number; page?: number; limit?: number };
      }>(`/api/v1/providers?${qs.toString()}`);

      const items: SearchProviderItem[] = (data.data ?? []).map((p) => ({
        id: String(p['id'] ?? ''),
        business_name: String(p['business_name'] ?? ''),
        average_rating: Number(p['average_rating'] ?? 0),
        review_count: Number(p['review_count'] ?? 0),
        services: (p['services'] as SearchProviderItem['services']) ?? [],
        work_locations: (p['work_locations'] as SearchProviderItem['work_locations']) ?? [],
        is_available: Boolean(p['is_available'] ?? false),
      }));

      const meta = {
        page: data.meta?.page ?? (params.page ?? 1),
        limit: data.meta?.limit ?? (params.limit ?? 20),
        total: data.meta?.total ?? items.length,
        total_pages: Math.ceil((data.meta?.total ?? items.length) / (params.limit ?? 20)),
      };

      return { data: items, meta };
    } catch (err) {
      this.logger.warn('Failed to fetch providers for search', err);
      return { data: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } };
    }
  }

  private hashParams(params: SearchRequestDto): string {
    return crypto.createHash('sha256').update(JSON.stringify(params as unknown as Record<string, unknown>)).digest('hex').slice(0, 12);
  }
}
