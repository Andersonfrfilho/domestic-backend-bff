import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { Inject, Injectable } from '@nestjs/common';

import { AppErrorFactory } from '@modules/error/app.error.factory';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import {
  getAuthorization,
  getRequestId,
  getTraceparent,
  getXAccessToken,
} from '@modules/shared/request-context/request-context';

import type {
  ApiClientGetParams,
  ApiClientPostParams,
  ApiClientPutParams,
} from './api-client.types';

@Injectable()
export class ApiClientService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
  ) {
    this.baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
    this.timeoutMs = Number(process.env.API_TIMEOUT_MS ?? 5000);
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    const requestId = getRequestId();
    if (requestId) headers['X-Request-Id'] = requestId;
    // Propaga W3C traceparent from Kong via AsyncLocalStorage — conecta spans no Tempo
    const traceparent = getTraceparent();
    if (traceparent) headers['traceparent'] = traceparent;
    // Kong injeta X-Access-Token (raw JWT) ou o mobile envia Authorization: Bearer <jwt>.
    // A API interna espera X-Access-Token (B2C) — apenas presença + JWT decodificável.
    const xAccessToken = getXAccessToken();
    if (xAccessToken) {
      headers['X-Access-Token'] = xAccessToken;
    } else {
      const authorization = getAuthorization();
      if (authorization) {
        headers['X-Access-Token'] = authorization.replace(/^bearer\s+/i, '');
      }
    }
    return headers;
  }

  private async readBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return undefined as unknown as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      this.logProvider.warn({
        message: `API returned non-JSON response: ${text.slice(0, 200)}`,
        context: `${this.constructor.name}.parseResponse`,
      });
      return undefined as unknown as T;
    }
  }

  async get<T>({ path, headers }: ApiClientGetParams): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: this.buildHeaders(headers),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await this.readBody(response);
        this.logProvider.warn({
          message: `API GET ${path} returned ${response.status}`,
          context: 'ApiClientService.get',
          meta: { status: response.status, body: errorBody.slice(0, 500) },
        });
        throw AppErrorFactory.internalServer({
          message: `API error ${response.status} on GET ${path}`,
        });
      }

      return this.parseResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  async post<T>({ path, body, headers }: ApiClientPostParams): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(headers),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await this.readBody(response);
        this.logProvider.warn({
          message: `API POST ${path} returned ${response.status}`,
          context: 'ApiClientService.post',
          meta: { status: response.status, body: errorBody.slice(0, 500) },
        });
        throw AppErrorFactory.internalServer({
          message: `API error ${response.status} on POST ${path}`,
        });
      }

      return this.parseResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  async put<T>({ path, body, headers }: ApiClientPutParams): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.buildHeaders(headers),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await this.readBody(response);
        this.logProvider.warn({
          message: `API PUT ${path} returned ${response.status}`,
          context: 'ApiClientService.put',
          meta: { status: response.status, body: errorBody.slice(0, 500) },
        });
        throw AppErrorFactory.internalServer({
          message: `API error ${response.status} on PUT ${path}`,
        });
      }

      return this.parseResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  async delete<T>({ path, headers }: ApiClientGetParams): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.buildHeaders(headers),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await this.readBody(response);
        this.logProvider.warn({
          message: `API DELETE ${path} returned ${response.status}`,
          context: 'ApiClientService.delete',
          meta: { status: response.status, body: errorBody.slice(0, 500) },
        });
        throw AppErrorFactory.internalServer({
          message: `API error ${response.status} on DELETE ${path}`,
        });
      }

      return this.parseResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }
}
