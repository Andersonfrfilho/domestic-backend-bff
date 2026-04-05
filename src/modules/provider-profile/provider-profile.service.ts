import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';

export interface ProviderProfileResponse {
  id: string;
  business_name: string;
  description: string | null;
  average_rating: number;
  review_count: number;
  is_available: boolean;
  verification_status: string;
  services: Array<{
    id: string;
    name: string;
    category: { id: string; name: string };
    price_base: number;
    price_type: string;
  }>;
  work_locations: Array<{ city: string; state: string; is_primary: boolean }>;
  recent_reviews: Array<{
    rating: number;
    comment: string | null;
    contractor_name: string;
    service_name: string;
    created_at: string;
  }>;
}

@Injectable()
export class ProviderProfileService {
  private readonly logger = new Logger(ProviderProfileService.name);

  constructor(
    private readonly api: ApiClientService,
    private readonly cache: BffCacheService,
  ) {}

  async getProfile(providerId: string, userHeaders: Record<string, string>): Promise<ProviderProfileResponse> {
    const cacheKey = `bff:provider-profile:${providerId}`;
    const cached = await this.cache.get<ProviderProfileResponse>(cacheKey);
    if (cached) return cached;

    const [provider, reviews] = await Promise.all([
      this.fetchProvider(providerId, userHeaders),
      this.fetchReviews(providerId, userHeaders),
    ]);

    if (!provider) throw new NotFoundException(`Provider ${providerId} not found`);

    const response: ProviderProfileResponse = {
      id: String(provider['id'] ?? ''),
      business_name: String(provider['business_name'] ?? ''),
      description: (provider['description'] as string | null) ?? null,
      average_rating: Number(provider['average_rating'] ?? 0),
      review_count: Number(provider['review_count'] ?? 0),
      is_available: Boolean(provider['is_available'] ?? false),
      verification_status: String(provider['verification_status'] ?? 'PENDING'),
      services: (provider['services'] as ProviderProfileResponse['services']) ?? [],
      work_locations: (provider['work_locations'] as ProviderProfileResponse['work_locations']) ?? [],
      recent_reviews: reviews,
    };

    const ttl = Number(process.env.CACHE_TTL_PROVIDER_PROFILE ?? 180);
    await this.cache.set(cacheKey, response, ttl);

    return response;
  }

  private async fetchProvider(id: string, headers: Record<string, string>): Promise<Record<string, unknown> | null> {
    try {
      return await this.api.get<Record<string, unknown>>(`/api/v1/providers/${id}`, headers);
    } catch (err) {
      this.logger.warn(`Failed to fetch provider ${id}`, err);
      return null;
    }
  }

  private async fetchReviews(
    providerId: string,
    headers: Record<string, string>,
  ): Promise<ProviderProfileResponse['recent_reviews']> {
    try {
      const data = await this.api.get<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]>(
        `/api/v1/reviews/provider/${providerId}?limit=5&sort=created_at`,
        headers,
      );
      const items = Array.isArray(data) ? data : ((data as { data?: Record<string, unknown>[] }).data ?? []);

      return items.map((r) => ({
        rating: Number(r['rating'] ?? 0),
        comment: (r['comment'] as string | null) ?? null,
        contractor_name: String(r['contractor_name'] ?? 'Anônimo'),
        service_name: String(r['service_name'] ?? ''),
        created_at: String(r['created_at'] ?? ''),
      }));
    } catch (err) {
      this.logger.warn(`Failed to fetch reviews for provider ${providerId}`, err);
      return [];
    }
  }
}
