/**
 * Chaves de cache Redis centralizadas.
 * Sempre que uma chave depende de outra (ex: app-config depende de navigation),
 * ambas devem ser invalidadas em conjunto. Consulte os comentários abaixo.
 */
export const CACHE_KEYS = {
  /** Config global do app (navigation + features + version). Invalidar ao mudar navigation. */
  APP_CONFIG: 'bff:app-config',

  /** Navigation por tela. Ao mudar, invalidar também APP_CONFIG. */
  NAVIGATION: (screenId: string) => `bff:navigation:${screenId}`,

  HOME: 'bff:home',

  SEARCH: (paramsHash: string) => `bff:search:${paramsHash}`,

  PROVIDER_PROFILE: (providerId: string) => `bff:provider-profile:${providerId}`,

  DASHBOARD_CONTRACTOR: (userId: string) => `bff:dashboard:contractor:${userId}`,

  DASHBOARD_PROVIDER: (userId: string) => `bff:dashboard:provider:${userId}`,
} as const;
