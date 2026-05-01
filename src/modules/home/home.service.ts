import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';
import type { ScreenConfig } from '@modules/shared/screen/schemas/screen-config.schema';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';

import type {
  FeaturedCategory,
  FeaturedProvider,
  HomeResponseDto,
  ScreenComponentData,
} from './dtos/home-response.dto';
import type {
  DefaultLayoutParams,
  DefaultLayoutResult,
  ResolveDataSourceParams,
  ResolveDataSourceResult,
} from './home.types';

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  return fallback;
};

const FALLBACK_CATEGORIES: FeaturedCategory[] = [
  { id: 'cleaning', name: 'Limpeza', slug: 'limpeza', iconUrl: null },
  { id: 'plumbing', name: 'Encanamento', slug: 'encanamento', iconUrl: null },
  { id: 'electrical', name: 'Eletricidade', slug: 'eletricidade', iconUrl: null },
  { id: 'gardening', name: 'Jardinagem', slug: 'jardinagem', iconUrl: null },
  { id: 'painting', name: 'Pintura', slug: 'pintura', iconUrl: null },
  { id: 'renovation', name: 'Reformas', slug: 'reformas', iconUrl: null },
];

const FALLBACK_PROVIDERS: FeaturedProvider[] = [
  {
    id: 'demo-1',
    businessName: 'Maria Serviços Domésticos',
    averageRating: 4.9,
    reviewCount: 127,
    services: [
      { name: 'Limpeza residencial', priceBase: 150, priceType: 'FIXED' },
      { name: 'Limpeza pós-obra', priceBase: 250, priceType: 'FIXED' },
    ],
    city: 'São Paulo',
    state: 'SP',
    isAvailable: true,
  },
  {
    id: 'demo-2',
    businessName: 'João Eletricista',
    averageRating: 4.7,
    reviewCount: 89,
    services: [
      { name: 'Instalação elétrica', priceBase: 120, priceType: 'FIXED' },
      { name: 'Manutenção preventiva', priceBase: 80, priceType: 'HOURLY' },
    ],
    city: 'São Paulo',
    state: 'SP',
    isAvailable: true,
  },
  {
    id: 'demo-3',
    businessName: 'Carlos Encanador',
    averageRating: 4.8,
    reviewCount: 64,
    services: [
      { name: 'Reparo de vazamento', priceBase: 100, priceType: 'FIXED' },
      { name: 'Instalação hidráulica', priceBase: 200, priceType: 'FIXED' },
    ],
    city: 'Guarulhos',
    state: 'SP',
    isAvailable: true,
  },
];

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
    @Inject(SCREEN_CONFIG_SERVICE)
    private readonly screenConfig: ScreenConfigService,
  ) {}

  async getHome(): Promise<HomeResponseDto> {
    const cached = await this.cache.get<HomeResponseDto>(CACHE_KEYS.HOME);
    if (cached) return cached;

    const [categoriesResult, providersResult, screenCfgResult] = await Promise.allSettled([
      this.fetchCategories(),
      this.fetchFeaturedProviders(),
      this.screenConfig.getActiveScreen('home'),
    ]);

    let categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
    let providers = providersResult.status === 'fulfilled' ? providersResult.value : [];
    let screenCfg = screenCfgResult.status === 'fulfilled' ? screenCfgResult.value : null;

    const hasPartialFailure =
      categoriesResult.status === 'rejected' ||
      providersResult.status === 'rejected' ||
      screenCfgResult.status === 'rejected';

    if (hasPartialFailure) {
      const errors = [
        categoriesResult.status === 'rejected' ? `categories: ${categoriesResult.reason}` : null,
        providersResult.status === 'rejected' ? `providers: ${providersResult.reason}` : null,
        screenCfgResult.status === 'rejected' ? `screenConfig: ${screenCfgResult.reason}` : null,
      ]
        .filter(Boolean)
        .join('; ');

      this.logger.warn(`Partial failure fetching home data: ${errors}`);

      if (categoriesResult.status === 'rejected') {
        this.logger.warn('Using fallback categories');
        categories = FALLBACK_CATEGORIES;
      }

      if (providersResult.status === 'rejected') {
        this.logger.warn('Using fallback providers');
        providers = FALLBACK_PROVIDERS;
      }
    }

    const isEmpty = categories.length === 0 && providers.length === 0;
    if (isEmpty) {
      this.logger.warn('No data available, using full fallback');
      categories = FALLBACK_CATEGORIES;
      providers = FALLBACK_PROVIDERS;
    }

    const layout: ScreenComponentData[] = screenCfg
      ? screenCfg.components
          .filter((c) => c.visible)
          .sort((a, b) => a.order - b.order)
          .map((c) => ({
            id: c.id,
            type: c.type,
            order: c.order,
            config: c.config,
            action: c.action ?? null,
            data: this.resolveDataSource({
              source: c.data_source,
              data: { categories, providers },
            }),
          }))
      : this.defaultLayout({ categories, providers });

    const response: HomeResponseDto = {
      layout,
      featuredCategories: categories,
      featuredProviders: providers,
    };

    const ttl = Number(process.env.CACHE_TTL_HOME ?? 300);
    await this.cache.set({ key: CACHE_KEYS.HOME, value: response, ttlSeconds: ttl });

    return response;
  }

  private async fetchCategories(): Promise<FeaturedCategory[]> {
    const data = await this.api.get<{ data?: unknown[]; items?: unknown[] } | unknown[]>({
      path: '/v1/categories',
    });
    const items = Array.isArray(data)
      ? data
      : ((data as { data?: unknown[]; items?: unknown[] }).data ??
        (data as { items?: unknown[] }).items ??
        []);
    return (items as Record<string, unknown>[]).map((c) => ({
      id: asString(c['id']),
      name: asString(c['name']),
      slug: asString(c['slug'], asString(c['name'])).toLowerCase().replaceAll(/\s+/g, '-'),
      iconUrl: (c['icon_url'] as string | null) ?? null,
    }));
  }

  private async fetchFeaturedProviders(): Promise<FeaturedProvider[]> {
    const data = await this.api.get<{ data?: unknown[] } | unknown[]>({
      path: '/v1/providers?sort=rating&limit=10&available=true',
    });
    const items = Array.isArray(data) ? data : ((data as { data?: unknown[] }).data ?? []);
    return (items as Record<string, unknown>[]).map((p) => ({
      id: asString(p['id']),
      businessName: asString(p['business_name'] ?? p['businessName']),
      averageRating: Number(p['average_rating'] ?? p['averageRating'] ?? 0),
      reviewCount: Number(p['review_count'] ?? p['reviewCount'] ?? 0),
      services: Array.isArray(p['services'])
        ? p['services'].map((s: unknown) => {
            const svc = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
            return {
              name: asString(svc['name'] ?? svc['service_name'] ?? svc['serviceName'] ?? s),
              priceBase: Number(svc['price_base'] ?? svc['priceBase'] ?? 0),
              priceType: asString(svc['price_type'] ?? svc['priceType'] ?? 'FIXED'),
            };
          })
        : [],
      city: asString(p['city']),
      state: asString(p['state']),
      latitude: asString(p['latitude']),
      longitude: asString(p['longitude']),
      isAvailable: Boolean(p['is_available'] ?? p['isAvailable'] ?? false),
    }));
  }

  private resolveDataSource({ source, data }: ResolveDataSourceParams): ResolveDataSourceResult {
    switch (source) {
      case 'categories':
        return data.categories;
      case 'featured_providers':
        return data.providers;
      default:
        return [];
    }
  }

  private defaultLayout({ categories, providers }: DefaultLayoutParams): DefaultLayoutResult {
    return [
      {
        id: 'categories',
        type: 'category_list',
        order: 0,
        config: { scroll: 'horizontal' },
        action: null,
        data: categories,
      },
      {
        id: 'featured',
        type: 'provider_grid',
        order: 1,
        config: { columns: 2 },
        action: { type: 'navigate', route: '/providers/{id}' },
        data: providers,
      },
    ];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _hashParams = (params: Record<string, unknown>) =>
  crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 12);
