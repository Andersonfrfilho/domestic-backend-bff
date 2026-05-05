import type { LogLevel } from '@modules/shared/enums/log.enum';

export interface LogBaseParams {
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
}

export interface LogContext {
  level: LogLevel;
  context: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface LogProviderInterface {
  info(params?: LogBaseParams): void;
  error(params?: LogBaseParams): void;
  warn(params?: LogBaseParams): void;
  debug(params?: LogBaseParams): void;
}
