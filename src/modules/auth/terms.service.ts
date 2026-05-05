import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';

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

  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
    private readonly env: EnvironmentProvider,
  ) {}

  async getCurrentVersion(): Promise<TermsVersionDto | null> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/auth/terms/current`);

    if (!response.ok) {
      this.logProvider.error({ message: `Failed to get current terms version: ${response.status}`, context: 'TermsService.getCurrentVersion' });
      throw new BadRequestException('Falha ao obter versão atual dos termos');
    }

    return safeJsonParse<TermsVersionDto | null>(response);
  }

  async listVersions(): Promise<TermsVersionDto[]> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/auth/terms/versions`);

    if (!response.ok) {
      this.logProvider.error({ message: `Failed to list terms versions: ${response.status}`, context: 'TermsService.listVersions' });
      throw new BadRequestException('Falha ao listar versões dos termos');
    }

    const result = await safeJsonParse<TermsVersionDto[]>(response);
    if (!result) {
      throw new BadRequestException('Empty response from terms versions');
    }
    return result;
  }

  async checkPending(userId: string): Promise<CheckPendingTermsDto> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/auth/terms/check-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      this.logProvider.error({ message: `Failed to check pending terms: ${response.status}`, context: 'TermsService.checkPending' });
      throw new BadRequestException('Falha ao verificar termos pendentes');
    }

    const result = await safeJsonParse<CheckPendingTermsDto>(response);
    if (!result) {
      throw new BadRequestException('Empty response from check pending terms');
    }
    return result;
  }

  async acceptTerms(userId: string, termsVersionId?: string): Promise<{ success: boolean; message: string; termsVersion: string }> {
    const response = await fetch(`${this.env.apiBaseUrl}/v1/auth/terms/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, termsVersionId }),
    });

    if (!response.ok) {
      this.logProvider.error({ message: `Failed to accept terms: ${response.status}`, context: 'TermsService.acceptTerms' });
      throw new BadRequestException('Falha ao aceitar termos');
    }

    const result = await safeJsonParse<{ success: boolean; message: string; termsVersion: string }>(response);
    if (!result) {
      throw new BadRequestException('Empty response from accept terms');
    }
    return result;
  }
}
