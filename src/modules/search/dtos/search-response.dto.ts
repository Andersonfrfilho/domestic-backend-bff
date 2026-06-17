export interface SearchProviderItem {
  id: string;
  businessName: string;
  avatarUrl: string | null;
  averageRating: number;
  reviewCount: number;
  services: Array<{ name: string; priceBase: number; priceType: string }>;
  workLocations: Array<{ city: string; state: string }>;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  isAvailable: boolean;
  nextAvailableDate: string | null;
  paymentMethods: Array<{ id: string; name: string; label: string; icon: string | null }>;
}

export interface SearchMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  priceRange: { min: number; max: number };
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  next: string | null;
  previous: string | null;
}

export interface SearchFilter {
  id: string;
  label: string;
  type: 'select' | 'range' | 'boolean' | 'chips';
  param: string;
  options?: Array<{ value: string; label: string }>;
  config: Record<string, unknown>;
}

export interface ComponentAction {
  type: 'navigate' | 'open_modal' | 'external_link' | 'none';
  route?: string;
  url?: string;
  params?: Record<string, string>;
}

export interface SearchLayoutComponent {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  /** Ação ao tocar. null = componente não interativo. */
  action: ComponentAction | null;
}

export interface SearchResponseDto {
  layout: SearchLayoutComponent[];
  filters: SearchFilter[];
  data: SearchProviderItem[];
  meta: SearchMeta;
  links: PaginationLinks;
  paymentMethodTypes: Array<{ id: string; name: string; label: string; icon: string | null }>;
}
