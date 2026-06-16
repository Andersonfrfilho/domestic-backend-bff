import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

import type {
  ContractorDashboard,
  FetchRequestsParams,
  FetchRequestsResult,
  GetContractorDashboardParams,
  GetContractorDashboardResult,
  GetProviderDashboardParams,
  GetProviderDashboardResult,
  ProviderDashboard,
  RequestSummary,
} from './dashboard.types';

export type { ContractorDashboard, ProviderDashboard, RequestSummary };

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  return fallback;
};

@Injectable()
export class DashboardService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  @TraceMethod()
  async getContractorDashboard({
    userId,
    headers,
  }: GetContractorDashboardParams): GetContractorDashboardResult {
    const cacheKey = CACHE_KEYS.DASHBOARD_CONTRACTOR(userId);
    const cached = await this.cache.get<ContractorDashboard>(cacheKey);
    if (cached) return cached;

    const [active, history, unread] = await Promise.all([
      this.fetchRequests({
        path: '/v1/service-requests?status=PENDING,ACCEPTED',
        headers: { ...headers, 'X-User-Type': 'CUSTOMER' },
      }),
      this.fetchRequests({
        path: '/v1/service-requests?status=COMPLETED,CANCELLED&limit=5',
        headers: { ...headers, 'X-User-Type': 'CUSTOMER' },
      }),
      this.fetchUnreadCount(headers),
    ]);

    const response: ContractorDashboard = {
      activeRequests: active.filter((r) => r.status === 'ACCEPTED'),
      pendingRequests: active.filter((r) => r.status === 'PENDING'),
      recentHistory: history,
      unreadNotifications: unread,
    };

    const ttl = Number(process.env.CACHE_TTL_DASHBOARD ?? 60);
    await this.cache.set({ key: cacheKey, value: response, ttlSeconds: ttl });
    return response;
  }

  async getProviderDashboard({
    userId,
    headers,
  }: GetProviderDashboardParams): GetProviderDashboardResult {
    const cacheKey = CACHE_KEYS.DASHBOARD_PROVIDER(userId);
    const cached = await this.cache.get<ProviderDashboard>(cacheKey);
    if (cached) return cached;

    const providerHeaders = { ...headers, 'X-User-Type': 'PROVIDER' };
    const [pending, active, providerData, unread] = await Promise.all([
      this.fetchRequests({ path: '/v1/service-requests?status=PENDING', headers: providerHeaders }),
      this.fetchRequests({
        path: '/v1/service-requests?status=ACCEPTED',
        headers: providerHeaders,
      }),
      this.fetchProviderStats(headers),
      this.fetchUnreadCount(headers),
    ]);

    const response: ProviderDashboard = {
      incomingRequests: pending,
      activeRequests: active,
      averageRating: providerData.averageRating,
      reviewCount: providerData.reviewCount,
      verificationStatus: providerData.verificationStatus,
      unreadNotifications: unread,
    };

    const ttl = Number(process.env.CACHE_TTL_DASHBOARD ?? 60);
    await this.cache.set({ key: cacheKey, value: response, ttlSeconds: ttl });
    return response;
  }

  private async fetchRequests({ path, headers }: FetchRequestsParams): FetchRequestsResult {
    try {
      const data = await this.api.get<
        { data?: Record<string, unknown>[] } | Record<string, unknown>[]
      >({ path, headers });
      const items = Array.isArray(data) ? data : (data.data ?? []);
      return items.map((r) => ({
        id: asString(r['id']),
        status: asString(r['status']),
        providerName:
          (r['provider'] as any)?.businessName ?? (r['provider_name'] as string | undefined),
        providerAvatar: (r['provider'] as any)?.avatarUrl as string | undefined,
        contractorName:
          (r['contractor'] as any)?.fullName ?? (r['contractor_name'] as string | undefined),
        serviceName: asString((r['service'] as any)?.name ?? r['service_name']),
        priceFinal:
          r['priceFinal'] != null
            ? Number(r['priceFinal'])
            : r['price_final'] != null
              ? Number(r['price_final'])
              : undefined,
        priceType: (r['ps_price_type'] ?? r['price_type']) as string | undefined,
        priceBase:
          (r['ps_price_base'] ?? r['price_base']) != null
            ? Number(r['ps_price_base'] ?? r['price_base'])
            : undefined,
        paymentMethod: (r['paymentMethodType'] as any)?.label as string | undefined,
        scheduledAt: (r['scheduledAt'] ?? r['scheduled_at']) as string | null,
        createdAt: (r['createdAt'] ?? r['created_at']) as string,
        description: (r['description'] as string | null) ?? null,
        address: r['address']
          ? {
              street: (r['address'] as any).street as string,
              number: (r['address'] as any).number as string,
              city: (r['address'] as any).city as string,
              state: (r['address'] as any).state as string,
              neighborhood: (r['address'] as any).neighborhood as string,
              latitude: (r['address'] as any).latitude as string | undefined,
              longitude: (r['address'] as any).longitude as string | undefined,
            }
          : undefined,
      }));
    } catch (err) {
      this.logProvider.warn({
        message: `Failed to fetch requests from ${path}`,
        context: 'DashboardService.fetchRequests',
        meta: { error: err },
      });
      return [];
    }
  }

  private async fetchProviderStats(headers: Record<string, string>) {
    try {
      const data = await this.api.get<Record<string, unknown>>({
        path: '/v1/providers/me',
        headers,
      });
      return {
        averageRating: Number(data['averageRating'] ?? data['average_rating'] ?? 0),
        reviewCount: Number(data['reviewCount'] ?? data['review_count'] ?? 0),
        verificationStatus: asString(
          data['verificationStatus'] ?? data['verification_status'],
          'PENDING',
        ),
      };
    } catch {
      return { averageRating: 0, reviewCount: 0, verificationStatus: 'PENDING' };
    }
  }

  private async fetchUnreadCount(headers: Record<string, string>): Promise<number> {
    try {
      const data = await this.api.get<{ count: number }>({
        path: '/v1/notifications/unread-count',
        headers,
      });
      return data.count ?? 0;
    } catch {
      return 0;
    }
  }
}
