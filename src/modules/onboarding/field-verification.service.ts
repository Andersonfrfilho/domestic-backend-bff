import { ConflictException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ApiClientService } from '../shared/api-client/api-client.service';

import { RateLimitService } from './rate-limit.service';

export interface VerificationResult {
  available: boolean;
  valid: boolean;
  field: string;
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
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas tentativas. Tente novamente em alguns minutos.',
          field: 'email',
          retryAfter: rateResult.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const normalized = email.toLowerCase().trim();

    try {
      const exists = await this.checkEmailExists(normalized);
      if (exists) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'E-mail já está em uso',
          field: 'email',
        });
      }
      return { available: true, valid: true, field: 'email' };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(`Email verification failed for: ${normalized}`, err);
      return { available: true, valid: true, field: 'email' };
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
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas tentativas. Tente novamente em alguns minutos.',
          field: 'phone',
          retryAfter: rateResult.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const normalized = phone.replace(/\D/g, '');

    try {
      const exists = await this.checkPhoneExists(normalized);
      if (exists) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'PHONE_ALREADY_EXISTS',
          message: 'Telefone já está cadastrado',
          field: 'phone',
        });
      }
      return { available: true, valid: true, field: 'phone' };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(`Phone verification failed for: ${normalized}`, err);
      return { available: true, valid: true, field: 'phone' };
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
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas tentativas. Tente novamente em alguns minutos.',
          field: 'document',
          retryAfter: rateResult.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const normalized = document.replace(/[^a-zA-Z0-9]/g, '');

    try {
      const exists = await this.checkDocumentExists(normalized);
      if (exists) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'DOCUMENT_ALREADY_EXISTS',
          message: 'Documento já está cadastrado',
          field: 'document',
        });
      }
      return { available: true, valid: true, field: 'document' };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(`Document verification failed for: ${normalized}`, err);
      return { available: true, valid: true, field: 'document' };
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
}
