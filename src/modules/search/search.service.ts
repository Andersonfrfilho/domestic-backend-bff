import * as crypto from 'node:crypto';

import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import {
  getAuthorization,
  getXAccessToken,
} from '@modules/shared/request-context/request-context';
import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';
import { computeNextAvailableDate } from '@modules/shared/utils/next-available-date';

function extractKeycloakIdFromContext(): string | undefined {
  const token = getXAccessToken() ?? getAuthorization()?.replace(/^bearer\s+/i, '');
  if (!token) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;
    return typeof payload['sub'] === 'string' ? payload['sub'] : undefined;
  } catch {
    return undefined;
  }
}

import type { SearchRequestDto } from './dtos/search-request.dto';
import type {
  SearchFilter,
  SearchLayoutComponent,
  SearchProviderItem,
  SearchResponseDto,
} from './dtos/search-response.dto';

const DEFAULT_FILTERS: SearchFilter[] = [
  {
    id: 'category',
    label: 'Categoria',
    type: 'select',
    param: 'categoryId',
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
    param: 'ratingMin',
    config: { min: 1, max: 5, step: 0.5 },
  },
  {
    id: 'available',
    label: 'Disponível agora',
    type: 'boolean',
    param: 'available',
    config: {},
  },
  {
    id: 'payment_method',
    label: 'Forma de pagamento',
    type: 'chips',
    param: 'paymentMethodId',
    options: [],
    config: {},
  },
  {
    id: 'day_of_week',
    label: 'Dia da semana',
    type: 'chips',
    param: 'dayOfWeek',
    options: [
      { value: '0', label: 'Dom' },
      { value: '1', label: 'Seg' },
      { value: '2', label: 'Ter' },
      { value: '3', label: 'Qua' },
      { value: '4', label: 'Qui' },
      { value: '5', label: 'Sex' },
      { value: '6', label: 'Sáb' },
    ],
    config: {},
  },
  {
    id: 'price_range',
    label: 'Faixa de preço',
    type: 'range',
    param: 'priceMin',
    config: { min: 0, max: 1000, step: 10 },
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
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
    @Inject(SCREEN_CONFIG_SERVICE)
    private readonly screenConfig: ScreenConfigService,
  ) {}

  @TraceMethod()
  async search(params: SearchRequestDto): Promise<SearchResponseDto> {
    const cacheKey = CACHE_KEYS.SEARCH(this.hashParams(params));
    const cached = await this.cache.get<SearchResponseDto>(cacheKey);
    if (cached) return cached;

    const [apiResult, screenCfgResult, paymentMethodTypesResult] = await Promise.allSettled([
      this.fetchProviders(params),
      this.screenConfig.getActiveScreen('search'),
      this.fetchPaymentMethodTypes(),
    ]);

    const apiData =
      apiResult.status === 'fulfilled'
        ? apiResult.value
        : { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, priceRange: { min: 0, max: 1000 } } };
    const screenCfg = screenCfgResult.status === 'fulfilled' ? screenCfgResult.value : null;
    const paymentMethodTypes =
      paymentMethodTypesResult.status === 'fulfilled' ? paymentMethodTypesResult.value : [];

    if (apiResult.status === 'rejected') {
      this.logProvider.warn({
        message: `Search API failed: ${apiResult.reason}`,
        context: 'SearchService.search',
      });
    }
    if (screenCfgResult.status === 'rejected') {
      this.logProvider.warn({
        message: `Search screen config failed: ${screenCfgResult.reason}`,
        context: 'SearchService.search',
      });
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

    const filters: SearchFilter[] = DEFAULT_FILTERS.map((f) => {
      if (f.id === 'payment_method' && paymentMethodTypes.length > 0) {
        return { ...f, options: paymentMethodTypes.map((pm) => ({ value: pm.id, label: pm.label })) };
      }
      return f;
    });

    const response: SearchResponseDto = {
      layout,
      filters,
      data: apiData.data,
      meta: apiData.meta,
      links: { first: null, last: null, next: null, previous: null },
      paymentMethodTypes,
    };

    const ttl = Number(process.env.CACHE_TTL_SEARCH ?? 120);
    await this.cache.set({ key: cacheKey, value: response, ttlSeconds: ttl });

    return response;
  }

  private async fetchProviders(params: SearchRequestDto) {
    const qs = new URLSearchParams();
    const categoryId = params.categoryId ?? params.category_id;
    const ratingMin = params.ratingMin ?? params.rating_min;
    const priceMin = params.priceMin ?? params.price_min;
    const priceMax = params.priceMax ?? params.price_max;
    if (params.q) qs.set('q', params.q);
    if (categoryId) qs.set('category_id', categoryId);
    if (params.city) qs.set('city', params.city);
    if (params.state) qs.set('state', params.state);
    if (ratingMin !== undefined) qs.set('rating_min', String(ratingMin));
    if (params.available !== undefined) qs.set('available', String(params.available));
    if (priceMin !== undefined) qs.set('price_min', String(priceMin));
    if (priceMax !== undefined) qs.set('price_max', String(priceMax));
    if (params.paymentMethodId) qs.set('payment_method_id', params.paymentMethodId);
    if (params.dayOfWeek !== undefined) qs.set('day_of_week', String(params.dayOfWeek));
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    const callerKeycloakId = extractKeycloakIdFromContext();
    if (callerKeycloakId) qs.set('exclude_keycloak_id', callerKeycloakId);

    const raw = await this.api.get<
      | Record<string, unknown>[]
      | {
          data?: Record<string, unknown>[];
          meta?: { total?: number; page?: number; limit?: number };
        }
    >({
      path: `/v1/providers?${qs.toString()}`,
    });

    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : (raw.data ?? []);
    const rawMeta = Array.isArray(raw) ? undefined : raw.meta;

    const data: SearchProviderItem[] = items.map((p) => ({
      id: asString(p['id']),
      businessName: asString(p['business_name'] ?? p['businessName']),
      avatarUrl: asString(p['avatar_url'] ?? p['avatarUrl']) || null,
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
      nextAvailableDate: computeNextAvailableDate(
        Array.isArray(p['activeDays']) ? (p['activeDays'] as number[]) : [],
      ),
      paymentMethods: Array.isArray(p['paymentMethods'])
        ? (p['paymentMethods'] as Record<string, unknown>[]).map((pm) => ({
            id: asString(pm['id']),
            name: asString(pm['name']),
            label: asString(pm['label']),
            icon: pm['icon'] ? asString(pm['icon']) : null,
          }))
        : [],
    }));

    const prices = data.flatMap((p) => p.services.map((s) => s.priceBase)).filter((v) => v > 0);
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 1000,
    };

    const total = rawMeta?.total ?? data.length;
    const limit = params.limit ?? 20;
    const meta = {
      page: rawMeta?.page ?? params.page ?? 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      priceRange,
    };

    return { data, meta };
  }

  private async fetchPaymentMethodTypes(): Promise<Array<{ id: string; name: string; label: string; icon: string | null }>> {
    const raw = await this.api.get<unknown[]>({ path: '/v1/providers/payment-method-types' });
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const pm = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
      return {
        id: asString(pm['id']),
        name: asString(pm['name']),
        label: asString(pm['label']),
        icon: pm['icon'] ? asString(pm['icon']) : null,
      };
    });
  }

  private hashParams(params: SearchRequestDto): string {
    return crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 12);
  }
}
