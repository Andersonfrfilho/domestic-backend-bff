import { Inject, Injectable } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
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
        headers: { 'Content-Type': 'application/json', ...headers },
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logProvider.warn({
          message: `API GET ${path} returned ${response.status}`,
          context: 'ApiClientService.get',
        });
        throw new Error(`API error ${response.status} on GET ${path}`);
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
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logProvider.warn({
          message: `API POST ${path} returned ${response.status}`,
          context: 'ApiClientService.post',
        });
        throw new Error(`API error ${response.status} on POST ${path}`);
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
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logProvider.warn({
          message: `API PUT ${path} returned ${response.status}`,
          context: 'ApiClientService.put',
        });
        throw new Error(`API error ${response.status} on PUT ${path}`);
      }

      return this.parseResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  }
}
