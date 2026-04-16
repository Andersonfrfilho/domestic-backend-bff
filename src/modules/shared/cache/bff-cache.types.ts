export interface BffCacheSetParams {
  key: string;
  value: unknown;
  ttlSeconds: number;
}

export interface BffCachePublishParams {
  channel: string;
  message: string;
}

export type BffCacheSetResult = void;
export type BffCachePublishResult = void;
