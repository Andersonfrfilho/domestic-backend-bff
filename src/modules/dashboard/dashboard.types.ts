export interface RequestSummary {
  id: string;
  status: string;
  providerName?: string;
  contractorName?: string;
  serviceName: string;
  scheduledAt: string | null;
  description: string | null;
}

export interface ContractorDashboard {
  activeRequests: RequestSummary[];
  pendingRequests: RequestSummary[];
  recentHistory: RequestSummary[];
  unreadNotifications: number;
}

export interface ProviderDashboard {
  incomingRequests: RequestSummary[];
  activeRequests: RequestSummary[];
  averageRating: number;
  reviewCount: number;
  verificationStatus: string;
  unreadNotifications: number;
}

export interface GetContractorDashboardParams {
  userId: string;
  headers: Record<string, string>;
}
export type GetContractorDashboardResult = Promise<ContractorDashboard>;

export interface GetProviderDashboardParams {
  userId: string;
  headers: Record<string, string>;
}
export type GetProviderDashboardResult = Promise<ProviderDashboard>;

export interface FetchRequestsParams {
  path: string;
  headers: Record<string, string>;
}
export type FetchRequestsResult = Promise<RequestSummary[]>;
