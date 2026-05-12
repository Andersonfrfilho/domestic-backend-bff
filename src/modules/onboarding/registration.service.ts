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

  async saveAddress(authorization: string, dto: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    lat?: string;
    lng?: string;
  }): Promise<{ addressId: string }> {
    const apiUrl = `${this.env.apiBaseUrl}/v1/users/me/addresses`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify({
        street: dto.street,
        number: dto.number,
        complement: dto.complement ?? null,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.cep,
        latitude: dto.lat ?? null,
        longitude: dto.lng ?? null,
        isPrimary: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logProvider.error({
        message: `Failed to save address: ${response.status} - ${errorText}`,
        context: 'RegistrationService.saveAddress',
      });
      throw AppErrorFactory.internalServer({ message: 'Falha ao salvar endereço' });
    }

    const data = await response.json();
    return { addressId: data.id };
  }

  private async createApiUser(dto: RegisterRequestDto): Promise<{ keycloakId: string; userId: string }> {
    const apiUrl = `${this.env.apiBaseUrl}/v1/onboarding/register`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        password: dto.password,
        termsAccepted: dto.termsAccepted,
        ...(dto.cpf || dto.cnpj ? { document: dto.cpf || dto.cnpj } : {}),
        ...(dto.cnpj ? {
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
