import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { EnvironmentProvider } from '@config/providers/environment.provider';

export interface TermsVersionDto {
  id: string;
  version: string;
  title: string;
  contentUrl: string | null;
  isActive: boolean;
  effectiveDate: Date;
}

export interface CheckPendingTermsDto {
  hasPending: boolean;
  currentVersion: string | null;
  lastAcceptedVersion: string | null;
}

@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);

  constructor(private readonly env: EnvironmentProvider) {}

  async getCurrentVersion(): Promise<TermsVersionDto | null> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/terms/current`);

    if (!response.ok) {
      this.logger.error(`Failed to get current terms version: ${response.status}`);
      throw new BadRequestException('Falha ao obter versão atual dos termos');
    }

    return response.json() as Promise<TermsVersionDto | null>;
  }

  async listVersions(): Promise<TermsVersionDto[]> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/terms/versions`);

    if (!response.ok) {
      this.logger.error(`Failed to list terms versions: ${response.status}`);
      throw new BadRequestException('Falha ao listar versões dos termos');
    }

    return response.json() as Promise<TermsVersionDto[]>;
  }

  async checkPending(userId: string): Promise<CheckPendingTermsDto> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/terms/check-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      this.logger.error(`Failed to check pending terms: ${response.status}`);
      throw new BadRequestException('Falha ao verificar termos pendentes');
    }

    return response.json() as Promise<CheckPendingTermsDto>;
  }

  async acceptTerms(userId: string, termsVersionId?: string): Promise<{ success: boolean; message: string; termsVersion: string }> {
    const response = await fetch(`${this.env.apiBaseUrl}/auth/terms/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, termsVersionId }),
    });

    if (!response.ok) {
      this.logger.error(`Failed to accept terms: ${response.status}`);
      throw new BadRequestException('Falha ao aceitar termos');
    }

    return response.json() as Promise<{ success: boolean; message: string; termsVersion: string }>;
  }
}
