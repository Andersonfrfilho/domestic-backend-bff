import { ConflictException, Injectable, Logger } from '@nestjs/common';

import { ApiClientService } from '../shared/api-client/api-client.service';

export interface VerificationResult {
  available: boolean;
  valid: boolean;
  field: string;
}

@Injectable()
export class FieldVerificationService {
  private readonly logger = new Logger(FieldVerificationService.name);

  constructor(
    private readonly apiClient: ApiClientService,
  ) {}

  async verifyEmail(email: string): Promise<VerificationResult> {
    const normalized = email.toLowerCase().trim();

    try {
      const exists = await this.checkEmailExists(normalized);
      if (exists) {
        throw new ConflictException({
          statusCode: 409,
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

  async verifyPhone(phone: string): Promise<VerificationResult> {
    const normalized = phone.replace(/\D/g, '');

    try {
      const exists = await this.checkPhoneExists(normalized);
      if (exists) {
        throw new ConflictException({
          statusCode: 409,
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

  async verifyDocument(document: string): Promise<VerificationResult> {
    const normalized = document.replace(/[^a-zA-Z0-9]/g, '');

    try {
      const exists = await this.checkDocumentExists(normalized);
      if (exists) {
        throw new ConflictException({
          statusCode: 409,
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
