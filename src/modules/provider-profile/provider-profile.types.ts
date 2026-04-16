export interface ProviderProfileResponse {
  id: string;
  businessName: string;
  description: string | null;
  averageRating: number;
  reviewCount: number;
  isAvailable: boolean;
  verificationStatus: string;
  services: Array<{
    id: string;
    name: string;
    category: { id: string; name: string };
    priceBase: number;
    priceType: string;
  }>;
  workLocations: Array<{ city: string; state: string; isPrimary: boolean }>;
  recentReviews: Array<{
    rating: number;
    comment: string | null;
    contractorName: string;
    serviceName: string;
    createdAt: string;
  }>;
}

export interface GetProfileParams {
  providerId: string;
  headers: Record<string, string>;
}
export type GetProfileResult = Promise<ProviderProfileResponse>;

export interface FetchProviderParams {
  id: string;
  headers: Record<string, string>;
}
export type FetchProviderResult = Promise<Record<string, unknown> | null>;

export interface FetchReviewsParams {
  providerId: string;
  headers: Record<string, string>;
}
export type FetchReviewsResult = Promise<ProviderProfileResponse['recentReviews']>;
