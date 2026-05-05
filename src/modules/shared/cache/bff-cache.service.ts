import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import type { BffCachePublishParams, BffCacheSetParams } from './bff-cache.types';

@Injectable()
export class BffCacheService {
  private readonly client: Redis;

  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
  ) {
    this.client = new Redis({
      host: process.env.CACHE_REDIS_HOST ?? 'localhost',
      port: Number(process.env.CACHE_REDIS_PORT ?? 6379),
      password: process.env.CACHE_REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });

    this.client.on('error', (err) =>
      this.logProvider.error({
        message: 'Redis connection error',
        context: 'BffCacheService.constructor',
        meta: { error: err },
      }),
    );
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set({ key, value, ttlSeconds }: BffCacheSetParams): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logProvider.warn({
        message: `Cache set failed for key ${key}`,
        context: 'BffCacheService.set',
        meta: { error: err },
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logProvider.warn({
        message: `Cache del failed for key ${key}`,
        context: 'BffCacheService.del',
        meta: { error: err },
      });
    }
  }

  /** Pub/Sub: publish para channel (chat) */
  async publish({ channel, message }: BffCachePublishParams): Promise<void> {
    await this.client.publish(channel, message);
  }

  /** Pub/Sub: retorna um cliente dedicado para subscribe */
  createSubscriber(): Redis {
    return this.client.duplicate();
  }
}
