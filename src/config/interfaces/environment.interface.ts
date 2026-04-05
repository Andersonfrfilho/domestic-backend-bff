import { NodeEnv } from '../types';

export interface EnvironmentProviderInterface {
  readonly port: number;
  readonly nodeEnv: NodeEnv;
  readonly projectName: string;

  readonly mongoUri: string;

  readonly redisHost: string;
  readonly redisPort: number;
  readonly redisPassword: string | undefined;

  readonly apiBaseUrl: string;
  readonly apiTimeoutMs: number;

  readonly wsCorsOrigins: string[];

  readonly cacheTtlHome: number;
  readonly cacheTtlSearch: number;
  readonly cacheTtlProviderProfile: number;
  readonly cacheTtlDashboard: number;

  isDevelopment(): boolean;
  isProduction(): boolean;
  isTest(): boolean;
}
