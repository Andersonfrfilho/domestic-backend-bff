export interface FeaturedCategory {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
}

export interface FeaturedProvider {
  id: string;
  business_name: string;
  average_rating: number;
  review_count: number;
  services: string[];
  city: string;
  state: string;
  is_available: boolean;
}

export interface ScreenComponentData {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  data: FeaturedCategory[] | FeaturedProvider[] | Record<string, unknown>[];
}

export interface HomeResponseDto {
  /** Configuração dinâmica de layout — SDUI */
  layout: ScreenComponentData[];
  /** Dados resolvidos por data_source (acesso direto para clientes que não usam SDUI) */
  featured_categories: FeaturedCategory[];
  featured_providers: FeaturedProvider[];
}
