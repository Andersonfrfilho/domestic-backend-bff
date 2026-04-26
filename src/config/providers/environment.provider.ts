import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ENV_VARS } from '@config/constants';
import { EnvironmentProviderInterface } from '@config/interfaces/environment.interface';
import { NodeEnv } from '@config/types';

@Injectable()
export class EnvironmentProvider implements EnvironmentProviderInterface {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.PORT);
  }

  get nodeEnv(): NodeEnv {
    return this.configService.getOrThrow<NodeEnv>(ENV_VARS.NODE_ENV);
  }

  get projectName(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.PROJECT_NAME);
  }

  get mongoUri(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.MONGO_URI);
  }

  get redisHost(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.CACHE_REDIS_HOST);
  }

  get redisPort(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.CACHE_REDIS_PORT);
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>(ENV_VARS.CACHE_REDIS_PASSWORD);
  }

  get apiBaseUrl(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.API_BASE_URL);
  }

  get apiTimeoutMs(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.API_TIMEOUT_MS);
  }

  get wsCorsOrigins(): string[] {
    const raw = this.configService.getOrThrow<string>(ENV_VARS.WS_CORS_ORIGINS);
    return raw.split(',').map((o) => o.trim());
  }

  get cacheTtlHome(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.CACHE_TTL_HOME);
  }

  get cacheTtlSearch(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.CACHE_TTL_SEARCH);
  }

  get cacheTtlProviderProfile(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.CACHE_TTL_PROVIDER_PROFILE);
  }

  get keycloakBaseUrl(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.KEYCLOAK_BASE_URL);
  }

  get keycloakRealm(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.KEYCLOAK_REALM);
  }

  get keycloakAdminUser(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.KEYCLOAK_ADMIN_USER);
  }

  get keycloakAdminPassword(): string {
    return this.configService.getOrThrow<string>(ENV_VARS.KEYCLOAK_ADMIN_PASSWORD);
  }

  get cacheTtlDashboard(): number {
    return this.configService.getOrThrow<number>(ENV_VARS.CACHE_TTL_DASHBOARD);
  }

  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}
