import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import type { BffCachePublishParams, BffCacheSetParams } from './bff-cache.types';

@Injectable()
export class BffCacheService {
  private readonly logger = new Logger(BffCacheService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.CACHE_REDIS_HOST ?? 'localhost',
      port: Number(process.env.CACHE_REDIS_PORT ?? 6379),
      password: process.env.CACHE_REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });

    this.client.on('error', (err) => this.logger.error('Redis connection error', err));
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
      this.logger.warn(`Cache set failed for key ${key}`, err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Cache del failed for key ${key}`, err);
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
