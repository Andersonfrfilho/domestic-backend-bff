import { Injectable, Logger } from '@nestjs/common';

import { ApiClientService } from '../shared/api-client/api-client.service';

import { RateLimitService } from './rate-limit.service';

export interface VerificationResult {
  available: boolean;
  valid: boolean;
}

@Injectable()
export class FieldVerificationService {
  private readonly logger = new Logger(FieldVerificationService.name);

  private readonly fieldConfig = {
    email: { max: 5, windowMs: 60000, blockDurationMs: 300000 },
    phone: { max: 5, windowMs: 60000, blockDurationMs: 300000 },
    document: { max: 3, windowMs: 60000, blockDurationMs: 600000 },
  } as const;

  constructor(
    private readonly apiClient: ApiClientService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async verifyEmail(ip: string, email: string): Promise<VerificationResult> {
    const rateKey = `email:${ip}`;
    const config = this.fieldConfig.email;

    const rateResult = await this.rateLimit.check(rateKey, {
      windowMs: config.windowMs,
      max: config.max,
      blockDurationMs: config.blockDurationMs,
    });

    if (!rateResult.allowed) {
      this.logger.warn(`Rate limit exceeded for email verification from IP: ${ip}`);
      throw new RateLimitExceededError(rateResult.retryAfter);
    }

    const normalized = email.toLowerCase().trim();

    try {
      const exists = await this.checkEmailExists(normalized);
      return { available: !exists, valid: true };
    } catch (err) {
      this.logger.error(`Email verification failed for: ${normalized}`, err);
      return { available: true, valid: true };
    }
  }

  async verifyPhone(ip: string, phone: string): Promise<VerificationResult> {
    const rateKey = `phone:${ip}`;
    const config = this.fieldConfig.phone;

    const rateResult = await this.rateLimit.check(rateKey, {
      windowMs: config.windowMs,
      max: config.max,
      blockDurationMs: config.blockDurationMs,
    });

    if (!rateResult.allowed) {
      this.logger.warn(`Rate limit exceeded for phone verification from IP: ${ip}`);
      throw new RateLimitExceededError(rateResult.retryAfter);
    }

    const normalized = phone.replace(/\D/g, '');

    try {
      const exists = await this.checkPhoneExists(normalized);
      return { available: !exists, valid: true };
    } catch (err) {
      this.logger.error(`Phone verification failed for: ${normalized}`, err);
      return { available: true, valid: true };
    }
  }

  async verifyDocument(ip: string, document: string): Promise<VerificationResult> {
    const rateKey = `document:${ip}`;
    const config = this.fieldConfig.document;

    const rateResult = await this.rateLimit.check(rateKey, {
      windowMs: config.windowMs,
      max: config.max,
      blockDurationMs: config.blockDurationMs,
    });

    if (!rateResult.allowed) {
      this.logger.warn(`Rate limit exceeded for document verification from IP: ${ip}`);
      throw new RateLimitExceededError(rateResult.retryAfter);
    }

    const normalized = document.replace(/\D/g, '');
    const isValidFormat = /^\d{11}$/.test(normalized) || /^\d{14}$/.test(normalized);

    if (!isValidFormat) {
      return { available: true, valid: false };
    }

    const isValidChecksum = normalized.length === 11
      ? this.validateCpf(normalized)
      : this.validateCnpj(normalized);

    if (!isValidChecksum) {
      return { available: true, valid: false };
    }

    try {
      const exists = await this.checkDocumentExists(normalized);
      return { available: !exists, valid: true };
    } catch (err) {
      this.logger.error(`Document verification failed for: ${normalized}`, err);
      return { available: true, valid: true };
    }
  }

  private async checkEmailExists(email: string): Promise<boolean> {
    try {
      await this.apiClient.post({
        path: '/v1/auth/verify/email',
        body: { email },
      });
      return false;
    } catch (err: any) {
      if (err.message?.includes('409')) return true;
      throw err;
    }
  }

  private async checkPhoneExists(phone: string): Promise<boolean> {
    try {
      await this.apiClient.post({
        path: '/v1/auth/verify/phone',
        body: { phone },
      });
      return false;
    } catch (err: any) {
      if (err.message?.includes('409')) return true;
      throw err;
    }
  }

  private async checkDocumentExists(document: string): Promise<boolean> {
    try {
      await this.apiClient.post({
        path: '/v1/auth/verify/document',
        body: { document },
      });
      return false;
    } catch (err: any) {
      if (err.message?.includes('409')) return true;
      throw err;
    }
  }

  private validateCpf(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf[10])) return false;

    return true;
  }

  private validateCnpj(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cnpj[i]) * weights1[i];
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cnpj[12])) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(cnpj[i]) * weights2[i];
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(cnpj[13])) return false;

    return true;
  }
}

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfter: number) {
    super('Muitas tentativas. Tente novamente em alguns minutos.');
    this.name = 'RateLimitExceededError';
  }
}
