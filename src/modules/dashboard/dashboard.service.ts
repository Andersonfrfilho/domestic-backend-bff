import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';

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
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  async getContractorDashboard({
    userId,
    headers,
  }: GetContractorDashboardParams): GetContractorDashboardResult {
    const cacheKey = CACHE_KEYS.DASHBOARD_CONTRACTOR(userId);
    const cached = await this.cache.get<ContractorDashboard>(cacheKey);
    if (cached) return cached;

    const [active, history, unread] = await Promise.all([
      this.fetchRequests({ path: '/v1/service-requests?status=PENDING,ACCEPTED', headers }),
      this.fetchRequests({
        path: '/v1/service-requests?status=COMPLETED,CANCELLED&limit=5',
        headers,
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

    const [pending, active, providerData, unread] = await Promise.all([
      this.fetchRequests({ path: '/v1/service-requests?status=PENDING', headers }),
      this.fetchRequests({ path: '/v1/service-requests?status=ACCEPTED', headers }),
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
      const items = Array.isArray(data)
        ? data
        : ((data as { data?: Record<string, unknown>[] }).data ?? []);
      return items.map((r) => ({
        id: asString(r['id']),
        status: asString(r['status']),
        providerName: r['provider_name'] as string | undefined,
        contractorName: r['contractor_name'] as string | undefined,
        serviceName: asString(r['service_name']),
        scheduledAt: (r['scheduled_at'] as string | null) ?? null,
        description: (r['description'] as string | null) ?? null,
      }));
    } catch (err) {
      this.logger.warn(`Failed to fetch requests from ${path}`, err);
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
        averageRating: Number(data['average_rating'] ?? 0),
        reviewCount: Number(data['review_count'] ?? 0),
        verificationStatus: asString(data['verification_status'], 'PENDING'),
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
