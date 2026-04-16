import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface FastifyLikeRequest {
  url?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  protocol?: string;
}

@Injectable()
export class CamelCaseResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyLikeRequest>();

    return next.handle().pipe(
      map((data) => {
        const camelized = this.deepCamelize(data);
        return this.addPaginationLinks(camelized, request);
      }),
    );
  }

  private addPaginationLinks(payload: unknown, request: FastifyLikeRequest): unknown {
    if (!this.isObject(payload)) return payload;

    const data = payload;
    const meta = data.meta;

    if (!this.isObject(meta)) return payload;

    const page = Number(meta.page);
    const limit = Number(meta.limit);
    const total = Number(meta.total);
    const totalPages = Number(meta.totalPages);

    if (![page, limit, total, totalPages].every((n) => Number.isFinite(n))) {
      return payload;
    }

    const nextPage = page < totalPages ? page + 1 : null;
    const previousPage = page > 1 ? page - 1 : null;

    const hasPages = totalPages >= 1;
    const firstPage = hasPages ? 1 : null;
    const lastPage = hasPages ? totalPages : null;

    const existingLinks = this.isObject(data.links) ? data.links : {};

    data.links = {
      ...existingLinks,
      first: firstPage ? this.buildPageLink(firstPage, limit, request) : null,
      last: lastPage ? this.buildPageLink(lastPage, limit, request) : null,
      next: nextPage ? this.buildPageLink(nextPage, limit, request) : null,
      previous: previousPage ? this.buildPageLink(previousPage, limit, request) : null,
    };

    return data;
  }

  private buildPageLink(targetPage: number, limit: number, request: FastifyLikeRequest): string {
    const queryParams = this.buildQueryParams(targetPage, limit, request.query);
    const path = this.getRequestPath(request);
    const base = this.getRequestBaseUrl(request);

    return `${base}${path}?${queryParams.toString()}`;
  }

  private buildQueryParams(
    targetPage: number,
    limit: number,
    query: FastifyLikeRequest['query'],
  ): URLSearchParams {
    const queryParams = new URLSearchParams();
    const input = query ?? {};

    for (const [rawKey, rawValue] of Object.entries(input)) {
      const key = this.toCamelKey(rawKey);
      if (key === 'page') continue;

      if (Array.isArray(rawValue)) {
        for (const item of rawValue) {
          queryParams.append(key, this.serializeQueryValue(item));
        }
        continue;
      }

      if (rawValue !== undefined && rawValue !== null) {
        queryParams.set(key, this.serializeQueryValue(rawValue));
      }
    }

    queryParams.set('page', String(targetPage));
    if (!queryParams.get('limit')) {
      queryParams.set('limit', String(limit));
    }

    return queryParams;
  }

  private serializeQueryValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'bigint') return String(value);
    if (typeof value === 'symbol') return String(value);
    if (typeof value === 'function') return value.name || 'function';
    return JSON.stringify(value);
  }

  private getRequestPath(request: FastifyLikeRequest): string {
    return (request.url ?? '/').split('?')[0] || '/';
  }

  private getRequestBaseUrl(request: FastifyLikeRequest): string {
    const protocol =
      this.resolveHeader(request.headers, 'x-forwarded-proto') ?? request.protocol ?? 'http';
    const host =
      this.resolveHeader(request.headers, 'x-forwarded-host') ??
      this.resolveHeader(request.headers, 'host');

    return host ? `${protocol}://${host}` : '';
  }

  private resolveHeader(headers: FastifyLikeRequest['headers'], key: string): string | undefined {
    const value = headers?.[key];
    return Array.isArray(value) ? value[0] : value;
  }

  private deepCamelize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.deepCamelize(item));
    }

    if (!this.isObject(value)) {
      return value;
    }

    const input = value;
    const output: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(input)) {
      if (key === '__v') continue;
      const camelKey = this.toCamelKey(key);
      output[camelKey] = this.deepCamelize(nestedValue);
    }

    return output;
  }

  private toCamelKey(key: string): string {
    if (key === '_id') return 'id';
    return key.replaceAll(/[_-]([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object') return false;
    if (value instanceof Date) return false;
    return Object.getPrototypeOf(value) === Object.prototype;
  }
}
