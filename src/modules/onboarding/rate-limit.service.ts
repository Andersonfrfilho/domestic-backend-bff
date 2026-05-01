import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  total: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  blockDurationMs: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.CACHE_REDIS_HOST ?? 'localhost',
      port: Number(process.env.CACHE_REDIS_PORT ?? 6379),
      password: process.env.CACHE_REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });

    this.client.on('error', (err) => this.logger.error('Redis rate limit error', err));
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const blockKey = `rate-limit:block:${key}`;
    const windowKey = `rate-limit:window:${key}`;

    try {
      const isBlocked = await this.client.get(blockKey);
      if (isBlocked) {
        const ttl = await this.client.ttl(blockKey);
        return {
          allowed: false,
          remaining: 0,
          retryAfter: ttl > 0 ? ttl : Math.ceil(config.blockDurationMs / 1000),
          total: config.max,
        };
      }

      const now = Date.now();
      const windowStart = now - config.windowMs;

      await this.client.zremrangebyscore(windowKey, 0, windowStart);

      const total = await this.client.zcard(windowKey);

      if (total >= config.max) {
        await this.client.set(blockKey, '1', 'PX', config.blockDurationMs);
        const oldestEntry = await this.client.zrange(windowKey, 0, 0, 'WITHSCORES');
        const retryAfter = oldestEntry[1]
          ? Math.ceil((parseInt(oldestEntry[1]) + config.windowMs - now) / 1000)
          : Math.ceil(config.blockDurationMs / 1000);

        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.max(retryAfter, 1),
          total,
        };
      }

      await this.client.zadd(windowKey, now, `${now}-${Math.random()}`);
      await this.client.expire(windowKey, Math.ceil(config.windowMs / 1000) + 1);

      return {
        allowed: true,
        remaining: config.max - total - 1,
        retryAfter: 0,
        total: total + 1,
      };
    } catch (err) {
      this.logger.error(`Rate limit check failed for key: ${key}`, err);
      return {
        allowed: true,
        remaining: config.max,
        retryAfter: 0,
        total: 0,
      };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.client.del(`rate-limit:window:${key}`);
      await this.client.del(`rate-limit:block:${key}`);
    } catch (err) {
      this.logger.warn(`Failed to reset rate limit for key: ${key}`, err);
    }
  }
}
