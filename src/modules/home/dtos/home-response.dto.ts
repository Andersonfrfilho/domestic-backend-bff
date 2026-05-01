export interface FeaturedCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
}

export interface ProviderService {
  name: string;
  priceBase: number;
  priceType: string;
}

export interface FeaturedProvider {
  id: string;
  businessName: string;
  averageRating: number;
  reviewCount: number;
  /** Shape unificado com search — nome + preço base + tipo de preço */
  services: ProviderService[];
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  isAvailable: boolean;
}

export interface ComponentAction {
  type: 'navigate' | 'open_modal' | 'external_link' | 'none';
  route?: string;
  url?: string;
  params?: Record<string, string>;
}

export interface ScreenComponentData {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  data: FeaturedCategory[] | FeaturedProvider[] | Record<string, unknown>[];
  /** Ação ao tocar. null = componente não interativo. */
  action: ComponentAction | null;
}

export interface HomeResponseDto {
  /** Configuração dinâmica de layout — SDUI */
  layout: ScreenComponentData[];
  /** Dados resolvidos por data_source (acesso direto para clientes que não usam SDUI) */
  featuredCategories: FeaturedCategory[];
  featuredProviders: FeaturedProvider[];
}
