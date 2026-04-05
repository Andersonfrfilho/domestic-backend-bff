export interface SearchProviderItem {
  id: string;
  business_name: string;
  average_rating: number;
  review_count: number;
  services: Array<{ name: string; price_base: number; price_type: string }>;
  work_locations: Array<{ city: string; state: string }>;
  is_available: boolean;
}

export interface SearchMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface SearchFilter {
  id: string;
  label: string;
  type: 'select' | 'range' | 'boolean' | 'chips';
  param: string;
  options?: Array<{ value: string; label: string }>;
  config: Record<string, unknown>;
}

export interface SearchLayoutComponent {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
}

export interface SearchResponseDto {
  /** Layout dinâmico dos filtros e resultados (SDUI) */
  layout: SearchLayoutComponent[];
  /** Filtros configurados dinamicamente */
  filters: SearchFilter[];
  data: SearchProviderItem[];
  meta: SearchMeta;
}
