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
    avatarUrl: null,
    averageRating: 4.9,
    reviewCount: 127,
    services: [
      { name: 'Limpeza residencial', priceBase: 150, priceType: 'FIXED' },
      { name: 'Limpeza pós-obra', priceBase: 250, priceType: 'FIXED' },
    ],
    city: 'São Paulo',
    state: 'SP',
    latitude: '-23.550520',
    longitude: '-46.633308',
    isAvailable: true,
    nextAvailableDate: null,
    paymentMethods: [],
  },
  {
    id: 'demo-2',
    businessName: 'João Eletricista',
    avatarUrl: null,
    averageRating: 4.7,
    reviewCount: 89,
    services: [
      { name: 'Instalação elétrica', priceBase: 120, priceType: 'FIXED' },
      { name: 'Manutenção preventiva', priceBase: 80, priceType: 'HOURLY' },
    ],
    city: 'São Paulo',
    state: 'SP',
    latitude: '-23.550520',
    longitude: '-46.633308',
    isAvailable: true,
    nextAvailableDate: null,
    paymentMethods: [],
  },
  {
    id: 'demo-3',
    businessName: 'Carlos Encanador',
    avatarUrl: null,
    averageRating: 4.8,
    reviewCount: 64,
    services: [
      { name: 'Reparo de vazamento', priceBase: 100, priceType: 'FIXED' },
      { name: 'Instalação hidráulica', priceBase: 200, priceType: 'FIXED' },
    ],
    city: 'Guarulhos',
    state: 'SP',
    latitude: '-23.462778',
    longitude: '-46.533333',
    isAvailable: true,
    nextAvailableDate: null,
    paymentMethods: [],
  },
];

@Injectable()
export class HomeService {
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
    const screenCfg = screenCfgResult.status === 'fulfilled' ? screenCfgResult.value : null;

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

      this.logProvider.warn({
        message: `Partial failure fetching home data: ${errors}`,
        context: 'HomeService.getHome',
      });

      if (categoriesResult.status === 'rejected') {
        this.logProvider.warn({
          message: 'Using fallback categories',
          context: 'HomeService.getHome',
        });
        categories = FALLBACK_CATEGORIES;
      }

      if (providersResult.status === 'rejected') {
        this.logProvider.warn({
          message: 'Using fallback providers',
          context: 'HomeService.getHome',
        });
        providers = FALLBACK_PROVIDERS;
      }
    }

    const isEmpty = categories.length === 0 && providers.length === 0;
    if (isEmpty) {
      this.logProvider.warn({
        message: 'No data available, using full fallback',
        context: 'HomeService.getHome',
      });
      categories = FALLBACK_CATEGORIES;
      providers = FALLBACK_PROVIDERS;
    }

    const resolvedFromMongo: ScreenComponentData[] | null = screenCfg
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
      : null;

    const allEmpty = resolvedFromMongo?.every((c) => (c.data as unknown[]).length === 0) ?? true;
    const layout: ScreenComponentData[] =
      resolvedFromMongo && !allEmpty ? resolvedFromMongo : this.defaultLayout({ categories, providers });

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
      : (data.data ?? (data as { items?: unknown[] }).items ?? []);
    return (items as Record<string, unknown>[]).map((c) => ({
      id: asString(c['id']),
      name: asString(c['name']),
      slug: asString(c['slug'], asString(c['name'])).toLowerCase().replaceAll(/\s+/g, '-'),
      iconUrl: (c['icon_url'] as string | null) ?? null,
    }));
  }

  private async fetchFeaturedProviders(): Promise<FeaturedProvider[]> {
    const callerKeycloakId = extractKeycloakIdFromContext();
    const excludeParam = callerKeycloakId ? `&exclude_keycloak_id=${encodeURIComponent(callerKeycloakId)}` : '';
    const data = await this.api.get<{ data?: unknown[] } | unknown[]>({
      path: `/v1/providers?sort=rating&limit=10&available=true${excludeParam}`,
    });
    const items = Array.isArray(data) ? data : (data.data ?? []);

    return (items as Record<string, unknown>[])
      .filter((p) => asString(p['id']))
      .map((p) => ({
        id: asString(p['id']),
        businessName: asString(p['business_name'] ?? p['businessName']),
        avatarUrl: asString(p['avatar_url'] ?? p['avatarUrl']) || null,
        averageRating: Number(p['average_rating'] ?? p['averageRating'] ?? 0),
        reviewCount: Number(p['review_count'] ?? p['reviewCount'] ?? 0),
        services: Array.isArray(p['services'])
          ? (p['services'] as Record<string, unknown>[]).map((s) => ({
              name: asString(s['name'] ?? s['service_name']),
              priceBase: Number(s['priceBase'] ?? s['price_base'] ?? 0),
              priceType: asString(s['priceType'] ?? s['price_type'] ?? 'FIXED'),
            }))
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
