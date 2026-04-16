export interface TabBarItemDto {
  id: string;
  label: string;
  icon: string;
  route: string;
  visible: boolean;
  badge?: number | null;
}

export interface TabBarDto {
  visible: boolean;
  items: TabBarItemDto[];
}

export interface HeaderActionDto {
  id: string;
  icon: string;
  action: string;
}

export interface NavigationHeaderDto {
  title: string | null;
  showBack: boolean;
  actions: HeaderActionDto[];
}

export interface NavigationDto {
  tabBar: TabBarDto;
  header: NavigationHeaderDto;
}

export interface FeaturesDto {
  chatEnabled: boolean;
  notificationsEnabled: boolean;
  reviewsEnabled: boolean;
  providerSearchEnabled: boolean;
}

export interface AppVersionDto {
  /** Versão mínima do app para continuar funcionando */
  minRequired: string;
  /** Versão mais recente disponível */
  latest: string;
  /** true → força atualização antes de continuar */
  forceUpdate: boolean;
}

export interface AppConfigResponseDto {
  navigation: NavigationDto;
  features: FeaturesDto;
  version: AppVersionDto;
}
