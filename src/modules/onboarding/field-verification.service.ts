import { ConflictException, Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { ApiClientService } from '../shared/api-client/api-client.service';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

export interface VerificationResult {
  available: boolean;
  valid: boolean;
  field: string;
}

@Injectable()
export class FieldVerificationService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly apiClient: ApiClientService,
  ) {}

  async verifyEmail(email: string): Promise<VerificationResult> {
    const normalized = email.toLowerCase().trim();

    try {
      await this.apiClient.post({
        path: '/v1/auth/verify/email',
        body: { email: normalized },
      });
      return { available: true, valid: true, field: 'email' };
    } catch (err: any) {
      if (err.message?.includes('409')) {
        throw new ConflictException({
          statusCode: 409,
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'E-mail já está em uso',
          field: 'email',
        });
      }

      this.logProvider.error({
        message: `Email verification failed for: ${normalized}`,
        context: 'FieldVerificationService.verifyEmail',
        meta: { error: err },
      });
      throw err;
    }
  }

  async verifyPhone(phone: string): Promise<VerificationResult> {
    const normalized = phone.replace(/\D/g, '');

    try {
      await this.apiClient.post({
        path: '/v1/auth/verify/phone',
        body: { phone: normalized },
      });
      return { available: true, valid: true, field: 'phone' };
    } catch (err: any) {
      if (err.message?.includes('409')) {
        throw new ConflictException({
          statusCode: 409,
          error: 'PHONE_ALREADY_EXISTS',
          message: 'Telefone já está cadastrado',
          field: 'phone',
        });
      }

      this.logProvider.error({
        message: `Phone verification failed for: ${normalized}`,
        context: 'FieldVerificationService.verifyPhone',
        meta: { error: err },
      });
      throw err;
    }
  }

  async verifyDocument(document: string): Promise<VerificationResult> {
    const normalized = document.replace(/[^a-zA-Z0-9]/g, '');

    try {
      await this.apiClient.post({
        path: '/v1/auth/verify/document',
        body: { document: normalized },
      });
      return { available: true, valid: true, field: 'document' };
    } catch (err: any) {
      if (err.message?.includes('409')) {
        throw new ConflictException({
          statusCode: 409,
          error: 'DOCUMENT_ALREADY_EXISTS',
          message: 'Documento já está cadastrado',
          field: 'document',
        });
      }

      this.logProvider.error({
        message: `Document verification failed for: ${normalized}`,
        context: 'FieldVerificationService.verifyDocument',
        meta: { error: err },
      });
      throw err;
    }
  }
}
