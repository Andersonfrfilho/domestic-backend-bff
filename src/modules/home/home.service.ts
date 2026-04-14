import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { ScreenConfigService } from '@modules/shared/screen/screen-config.service';
import { SCREEN_CONFIG_SERVICE } from '@modules/shared/screen/screen-config.token';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';

import type { FeaturedCategory, FeaturedProvider, HomeResponseDto, ScreenComponentData } from './dtos/home-response.dto';

const CACHE_KEY = 'bff:home';

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
    const cached = await this.cache.get<HomeResponseDto>(CACHE_KEY);
    if (cached) return cached;

    const [categories, providers, screenCfg] = await Promise.all([
      this.fetchCategories(),
      this.fetchFeaturedProviders(),
      this.screenConfig.getActiveScreen('home'),
    ]);

    // Resolve cada componente do layout com seus dados
    const layout: ScreenComponentData[] = screenCfg
      ? screenCfg.components
          .filter((c) => c.visible)
          .sort((a, b) => a.order - b.order)
          .map((c) => ({
            id: c.id,
            type: c.type,
            order: c.order,
            config: c.config,
            data: this.resolveDataSource(c.data_source, { categories, providers }),
          }))
      : this.defaultLayout(categories, providers);

    const response: HomeResponseDto = {
      layout,
      featured_categories: categories,
      featured_providers: providers,
    };

    const ttl = Number(process.env.CACHE_TTL_HOME ?? 300);
    await this.cache.set(CACHE_KEY, response, ttl);

    return response;
  }

  private async fetchCategories(): Promise<FeaturedCategory[]> {
    try {
      const data = await this.api.get<{ data?: unknown[]; items?: unknown[] } | unknown[]>('/api/v1/categories');
      const items = Array.isArray(data) ? data : ((data as { data?: unknown[]; items?: unknown[] }).data ?? (data as { items?: unknown[] }).items ?? []);
      return (items as Record<string, unknown>[]).map((c) => ({
        id: String(c['id'] ?? ''),
        name: String(c['name'] ?? ''),
        slug: String(c['slug'] ?? c['name'] ?? '').toLowerCase().replace(/\s+/g, '-'),
        icon_url: (c['icon_url'] as string | null) ?? null,
      }));
    } catch (err) {
      this.logger.warn('Failed to fetch categories', err);
      return [];
    }
  }

  private async fetchFeaturedProviders(): Promise<FeaturedProvider[]> {
    try {
      const data = await this.api.get<{ data?: unknown[] } | unknown[]>('/api/v1/providers?sort=rating&limit=10&available=true');
      const items = Array.isArray(data) ? data : ((data as { data?: unknown[] }).data ?? []);
      return (items as Record<string, unknown>[]).map((p) => ({
        id: String(p['id'] ?? ''),
        business_name: String(p['business_name'] ?? ''),
        average_rating: Number(p['average_rating'] ?? 0),
        review_count: Number(p['review_count'] ?? 0),
        services: (p['services'] as string[]) ?? [],
        city: String(p['city'] ?? ''),
        state: String(p['state'] ?? ''),
        is_available: Boolean(p['is_available'] ?? false),
      }));
    } catch (err) {
      this.logger.warn('Failed to fetch featured providers', err);
      return [];
    }
  }

  private resolveDataSource(
    source: string,
    data: { categories: FeaturedCategory[]; providers: FeaturedProvider[] },
  ): FeaturedCategory[] | FeaturedProvider[] | Record<string, unknown>[] {
    switch (source) {
      case 'categories': return data.categories;
      case 'featured_providers': return data.providers;
      default: return [];
    }
  }

  private defaultLayout(
    categories: FeaturedCategory[],
    providers: FeaturedProvider[],
  ): ScreenComponentData[] {
    return [
      { id: 'categories', type: 'category_list', order: 0, config: { scroll: 'horizontal' }, data: categories },
      { id: 'featured', type: 'provider_grid', order: 1, config: { columns: 2 }, data: providers },
    ];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _hashParams = (params: Record<string, unknown>) =>
  crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 12);
