export const buildKeycloakConfigFromEnv = () => ({
  baseUrl: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'domestic',
  credentials: {
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'domestic-bff',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || 'backend-bff-client-secret',
    grantType: (process.env.KEYCLOAK_GRANT_TYPE as any) || 'client_credentials',
  },
});
