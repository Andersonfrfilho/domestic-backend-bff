import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';

import type {
  FetchProviderParams,
  FetchProviderResult,
  FetchReviewsParams,
  FetchReviewsResult,
  GetProfileParams,
  GetProfileResult,
  ProviderProfileResponse,
} from './provider-profile.types';

export type { ProviderProfileResponse };

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const toRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

@Injectable()
export class ProviderProfileService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  async getProfile({ providerId, headers }: GetProfileParams): GetProfileResult {
    const cacheKey = CACHE_KEYS.PROVIDER_PROFILE(providerId);
    const cached = await this.cache.get<ProviderProfileResponse>(cacheKey);
    if (cached) return cached;

    const [provider, reviews] = await Promise.all([
      this.fetchProvider({ id: providerId, headers }),
      this.fetchReviews({ providerId, headers }),
    ]);

    if (!provider) throw new NotFoundException(`Provider ${providerId} not found`);

    const response: ProviderProfileResponse = {
      id: asString(provider['id']),
      businessName: asString(provider['business_name']),
      description: (provider['description'] as string | null) ?? null,
      averageRating: Number(provider['average_rating'] ?? 0),
      reviewCount: Number(provider['review_count'] ?? 0),
      isAvailable: Boolean(provider['is_available'] ?? false),
      verificationStatus: asString(provider['verification_status'], 'PENDING'),
      services: Array.isArray(provider['services'])
        ? provider['services'].map((s: unknown) => {
            const svc = toRecord(s);
            const category = toRecord(svc['category']);
            return {
              id: asString(svc['id']),
              name: asString(svc['name']),
              category: {
                id: asString(category['id']),
                name: asString(category['name']),
              },
              priceBase: Number(svc['price_base'] ?? 0),
              priceType: asString(svc['price_type']),
            };
          })
        : [],
      workLocations: Array.isArray(provider['work_locations'])
        ? provider['work_locations'].map((w: unknown) => {
            const loc = toRecord(w);
            return {
              city: asString(loc['city']),
              state: asString(loc['state']),
              isPrimary: Boolean(loc['is_primary'] ?? false),
            };
          })
        : [],
      recentReviews: reviews,
    };

    const ttl = Number(process.env.CACHE_TTL_PROVIDER_PROFILE ?? 180);
    await this.cache.set({ key: cacheKey, value: response, ttlSeconds: ttl });

    return response;
  }

  private async fetchProvider({ id, headers }: FetchProviderParams): FetchProviderResult {
    try {
      return await this.api.get<Record<string, unknown>>({
        path: `/v1/providers/${id}`,
        headers,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? `: ${err.message}` : '';
      this.logProvider.warn({
        message: `Failed to fetch provider ${id}${errMsg}`,
        context: 'ProviderProfileService.fetchProvider',
      });
      return null;
    }
  }

  private async fetchReviews({ providerId, headers }: FetchReviewsParams): FetchReviewsResult {
    try {
      const data = await this.api.get<
        { data?: Record<string, unknown>[] } | Record<string, unknown>[]
      >({
        path: `/v1/reviews/provider/${providerId}?limit=5&sort=created_at`,
        headers,
      });
      const items = Array.isArray(data)
        ? data
        : ((data as { data?: Record<string, unknown>[] }).data ?? []);

      return items.map((r) => ({
        rating: Number(r['rating'] ?? 0),
        comment: (r['comment'] as string | null) ?? null,
        contractorName: asString(r['contractor_name'], 'Anônimo'),
        serviceName: asString(r['service_name']),
        createdAt: asString(r['created_at']),
      }));
    } catch (err) {
      const errMsg = err instanceof Error ? `: ${err.message}` : '';
      this.logProvider.warn({
        message: `Failed to fetch reviews for provider ${providerId}${errMsg}`,
        context: 'ProviderProfileService.fetchReviews',
      });
      return [];
    }
  }
}
