import { Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { EnvironmentProvider } from '@config/providers/environment.provider';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { RegistrationServiceInterface } from './interfaces/registration-service.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';

@Injectable()
export class RegistrationService implements RegistrationServiceInterface {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    private readonly env: EnvironmentProvider,
  ) {}

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    try {
      const result = await this.createApiUser(dto);

      this.logProvider.info({
        message: `User registered successfully: ${dto.email}`,
        context: 'RegistrationService.register',
      });

      return {
        keycloakId: result.keycloakId,
        email: dto.email,
        success: true,
        message: 'Usuário criado com sucesso',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to register user ${dto.email}: ${error.message}`,
        context: 'RegistrationService.register',
      });

      if (error.message?.includes('409') || error.message?.includes('already exists') || error.message?.includes('E-mail já está em uso')) {
        throw AppErrorFactory.conflict({ message: 'E-mail já está em uso', code: 'EMAIL_ALREADY_EXISTS' });
      }

      throw AppErrorFactory.internalServer({ message: 'Falha ao criar usuário' });
    }
  }

  private async createApiUser(dto: RegisterRequestDto): Promise<{ keycloakId: string; userId: string }> {
    const apiUrl = `${this.env.apiBaseUrl}/onboarding/register`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        password: dto.password,
        ...(dto.cpf ? { cpf: dto.cpf } : {}),
        ...(dto.cnpj ? {
          cnpj: dto.cnpj,
          companyName: dto.companyName,
          tradeName: dto.tradeName,
        } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logProvider.error({
        message: `API user creation failed: ${response.status} - ${errorText}`,
        context: 'RegistrationService.createApiUser',
      });
      throw AppErrorFactory.internalServer({ message: 'Falha ao criar usuário na API' });
    }

    return response.json();
  }
}
