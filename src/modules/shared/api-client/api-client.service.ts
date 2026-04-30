import { Injectable, Logger } from '@nestjs/common';

import type {
  ApiClientGetParams,
  ApiClientPostParams,
  ApiClientPutParams,
} from './api-client.types';

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
    this.timeoutMs = Number(process.env.API_TIMEOUT_MS ?? 5000);
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
        this.logger.warn(`API GET ${path} returned ${response.status}`);
        throw new Error(`API error ${response.status} on GET ${path}`);
      }

      return response.json() as Promise<T>;
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
        this.logger.warn(`API POST ${path} returned ${response.status}`);
        throw new Error(`API error ${response.status} on POST ${path}`);
      }

      return response.json() as Promise<T>;
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
        this.logger.warn(`API PUT ${path} returned ${response.status}`);
        throw new Error(`API error ${response.status} on PUT ${path}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }
}
