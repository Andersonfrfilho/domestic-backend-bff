import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import type {
  FetchProviderParams,
  FetchProviderResult,
  FetchReviewsParams,
  FetchReviewsResult,
  GetBusySlotsParams,
  GetBusySlotsResult,
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

  @TraceMethod()
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
      businessName: asString(provider['businessName'] ?? provider['business_name']),
      description: (provider['description'] as string | null) ?? null,
      averageRating: Number(provider['averageRating'] ?? provider['average_rating'] ?? 0),
      reviewCount: Number(provider['reviewCount'] ?? provider['review_count'] ?? 0),
      isAvailable: Boolean(provider['isAvailable'] ?? provider['is_available'] ?? false),
      avatarUrl: (provider['avatarUrl'] ?? provider['avatar_url'] ?? null) as string | null,
      verificationStatus: asString(
        provider['verificationStatus'] ?? provider['verification_status'],
        'PENDING',
      ),
      services: Array.isArray(provider['services'])
        ? provider['services'].map((s: unknown) => {
            const svc = toRecord(s);
            const category = toRecord(svc['category']);
            const rawDuration =
              svc['estimatedDurationMinutes'] ?? svc['estimated_duration_minutes'];
            return {
              id: asString(svc['id']),
              name: asString(svc['name']),
              category: {
                id: asString(category['id']),
                name: asString(category['name']),
              },
              priceBase: Number(svc['priceBase'] ?? svc['price_base'] ?? 0),
              priceType: asString(svc['priceType'] ?? svc['price_type']),
              estimatedDurationMinutes:
                rawDuration != null && rawDuration !== '' ? Number(rawDuration) : null,
            };
          })
        : [],
      workLocations: (() => {
        const locations = provider['workLocations'] ?? provider['work_locations'];
        return Array.isArray(locations)
          ? locations.map((w: unknown) => {
              const loc = toRecord(w);
              return {
                city: asString(loc['city']),
                state: asString(loc['state']),
                isPrimary: Boolean(loc['isPrimary'] ?? loc['is_primary'] ?? false),
              };
            })
          : [];
      })(),
      paymentMethods: (() => {
        const methods = provider['paymentMethods'] ?? provider['payment_methods'];
        return Array.isArray(methods)
          ? methods.map((m: unknown) => {
              const method = toRecord(m);
              return {
                id: asString(method['id']),
                name: asString(method['name']),
                label: asString(method['label']),
                icon: (method['icon'] as string | null) ?? null,
                isEnabled: Boolean(method['isEnabled'] ?? method['is_enabled'] ?? true),
              };
            })
          : [];
      })(),
      recentReviews: reviews,
      availability: (() => {
        const slots = provider['availability'];
        return Array.isArray(slots)
          ? slots.map((s: unknown) => {
              const slot = toRecord(s);
              return {
                dayOfWeek: Number(slot['dayOfWeek'] ?? slot['day_of_week'] ?? 0),
                startTime: asString(slot['startTime'] ?? slot['start_time']),
                endTime: asString(slot['endTime'] ?? slot['end_time']),
              };
            })
          : [];
      })(),
    };

    const ttl = Number(process.env.CACHE_TTL_PROVIDER_PROFILE ?? 180);
    await this.cache.set({ key: cacheKey, value: response, ttlSeconds: ttl });

    return response;
  }

  @TraceMethod()
  async getBusySlots({ providerId, date, headers }: GetBusySlotsParams): GetBusySlotsResult {
    try {
      const rows = await this.api.get<{ scheduledAt: string; estimatedHours: number }[]>({
        path: `/v1/service-requests/busy-slots?providerId=${providerId}&date=${date}`,
        headers,
      });
      return (rows ?? []).map((row) => ({
        scheduledAt: row.scheduledAt,
        estimatedHours: Number(row.estimatedHours),
      }));
    } catch (err) {
      const errMsg = err instanceof Error ? `: ${err.message}` : '';
      this.logProvider.warn({
        message: `Failed to fetch busy slots for provider ${providerId} on ${date}${errMsg}`,
        context: 'ProviderProfileService.getBusySlots',
      });
      return [];
    }
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
      const items = Array.isArray(data) ? data : (data.data ?? []);

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
