export interface ProviderProfileResponse {
  id: string;
  businessName: string;
  description: string | null;
  averageRating: number;
  reviewCount: number;
  isAvailable: boolean;
  avatarUrl: string | null;
  verificationStatus: string;
  services: Array<{
    id: string;
    name: string;
    category: { id: string; name: string };
    priceBase: number;
    priceType: string;
    estimatedDurationMinutes: number | null;
  }>;
  workLocations: Array<{ city: string; state: string; isPrimary: boolean }>;
  paymentMethods: Array<{
    id: string;
    name: string;
    label: string;
    icon: string | null;
    isEnabled: boolean;
  }>;
  recentReviews: Array<{
    rating: number;
    comment: string | null;
    contractorName: string;
    serviceName: string;
    createdAt: string;
  }>;
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
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

export interface BusySlot {
  scheduledAt: string;
  estimatedHours: number;
}

export interface GetBusySlotsParams {
  providerId: string;
  date: string;
  headers: Record<string, string>;
}
export type GetBusySlotsResult = Promise<BusySlot[]>;
