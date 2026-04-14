import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

export interface ContractorDashboard {
  active_requests: RequestSummary[];
  pending_requests: RequestSummary[];
  recent_history: RequestSummary[];
  unread_notifications: number;
}

export interface ProviderDashboard {
  incoming_requests: RequestSummary[];
  active_requests: RequestSummary[];
  average_rating: number;
  review_count: number;
  verification_status: string;
  unread_notifications: number;
}

export interface RequestSummary {
  id: string;
  status: string;
  provider_name?: string;
  contractor_name?: string;
  service_name: string;
  scheduled_at: string | null;
  description: string | null;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(API_CLIENT_SERVICE)
    private readonly api: ApiClientService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  async getContractorDashboard(userId: string, headers: Record<string, string>): Promise<ContractorDashboard> {
    const cacheKey = `bff:dashboard:contractor:${userId}`;
    const cached = await this.cache.get<ContractorDashboard>(cacheKey);
    if (cached) return cached;

    const [active, history, unread] = await Promise.all([
      this.fetchRequests('/api/v1/service-requests?status=PENDING,ACCEPTED', headers),
      this.fetchRequests('/api/v1/service-requests?status=COMPLETED,CANCELLED&limit=5', headers),
      this.fetchUnreadCount(headers),
    ]);

    const response: ContractorDashboard = {
      active_requests: active.filter((r) => r.status === 'ACCEPTED'),
      pending_requests: active.filter((r) => r.status === 'PENDING'),
      recent_history: history,
      unread_notifications: unread,
    };

    const ttl = Number(process.env.CACHE_TTL_DASHBOARD ?? 60);
    await this.cache.set(cacheKey, response, ttl);
    return response;
  }

  async getProviderDashboard(userId: string, headers: Record<string, string>): Promise<ProviderDashboard> {
    const cacheKey = `bff:dashboard:provider:${userId}`;
    const cached = await this.cache.get<ProviderDashboard>(cacheKey);
    if (cached) return cached;

    const [pending, active, providerData, unread] = await Promise.all([
      this.fetchRequests('/api/v1/service-requests?status=PENDING', headers),
      this.fetchRequests('/api/v1/service-requests?status=ACCEPTED', headers),
      this.fetchProviderStats(headers),
      this.fetchUnreadCount(headers),
    ]);

    const response: ProviderDashboard = {
      incoming_requests: pending,
      active_requests: active,
      average_rating: providerData.average_rating,
      review_count: providerData.review_count,
      verification_status: providerData.verification_status,
      unread_notifications: unread,
    };

    const ttl = Number(process.env.CACHE_TTL_DASHBOARD ?? 60);
    await this.cache.set(cacheKey, response, ttl);
    return response;
  }

  private async fetchRequests(path: string, headers: Record<string, string>): Promise<RequestSummary[]> {
    try {
      const data = await this.api.get<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]>(path, headers);
      const items = Array.isArray(data) ? data : ((data as { data?: Record<string, unknown>[] }).data ?? []);
      return items.map((r) => ({
        id: String(r['id'] ?? ''),
        status: String(r['status'] ?? ''),
        provider_name: r['provider_name'] as string | undefined,
        contractor_name: r['contractor_name'] as string | undefined,
        service_name: String(r['service_name'] ?? ''),
        scheduled_at: (r['scheduled_at'] as string | null) ?? null,
        description: (r['description'] as string | null) ?? null,
      }));
    } catch (err) {
      this.logger.warn(`Failed to fetch requests from ${path}`, err);
      return [];
    }
  }

  private async fetchProviderStats(headers: Record<string, string>) {
    try {
      const data = await this.api.get<Record<string, unknown>>('/api/v1/providers/me', headers);
      return {
        average_rating: Number(data['average_rating'] ?? 0),
        review_count: Number(data['review_count'] ?? 0),
        verification_status: String(data['verification_status'] ?? 'PENDING'),
      };
    } catch {
      return { average_rating: 0, review_count: 0, verification_status: 'PENDING' };
    }
  }

  private async fetchUnreadCount(headers: Record<string, string>): Promise<number> {
    try {
      const data = await this.api.get<{ count: number }>('/api/v1/notifications/unread-count', headers);
      return data.count ?? 0;
    } catch {
      return 0;
    }
  }
}
