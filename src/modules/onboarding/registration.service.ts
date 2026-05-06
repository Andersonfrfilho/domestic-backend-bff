import { Injectable, Inject } from '@nestjs/common';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { EnvironmentProvider } from '@config/providers/environment.provider';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';
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
      const adminToken = await this.getAdminToken();

      const keycloakId = await this.createKeycloakUser(adminToken, dto);

      await this.createApiUser(dto, keycloakId);

      this.logProvider.info({
        message: `User registered successfully: ${dto.email}`,
        context: 'RegistrationService.register',
      });

      return {
        keycloakId,
        email: dto.email,
        success: true,
        message: 'Usuário criado com sucesso',
      };
    } catch (error) {
      this.logProvider.error({
        message: `Failed to register user ${dto.email}: ${error.message}`,
        context: 'RegistrationService.register',
      });

      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        throw AppErrorFactory.conflict({ message: 'E-mail já está em uso', code: 'EMAIL_ALREADY_EXISTS' });
      }

      throw AppErrorFactory.internalServer({ message: 'Falha ao criar usuário' });
    }
  }

  private async getAdminToken(): Promise<string> {
    const url = `${this.env.keycloakBaseUrl}/realms/master/protocol/openid-connect/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'admin-cli');
    params.append('username', this.env.keycloakAdminUser);
    params.append('password', this.env.keycloakAdminPassword);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: `Keycloak admin token request failed: ${response.status}` });
    }

    const data = await safeJsonParse<{ access_token: string }>(response);
    if (!data?.access_token) {
      throw AppErrorFactory.internalServer({ message: 'Keycloak admin token response missing access_token' });
    }
    return data.access_token;
  }

  private async createKeycloakUser(token: string, dto: RegisterRequestDto): Promise<string> {
    const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: dto.email,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        enabled: true,
        emailVerified: false,
        attributes: {
          phone: [dto.phone],
          ...(dto.cpf ? { cpf: [dto.cpf] } : {}),
        },
        credentials: [
          {
            type: 'password',
            value: dto.password,
            temporary: false,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw AppErrorFactory.internalServer({ message: `Keycloak user creation failed: ${response.status} - ${errorText}` });
    }

    const locationHeader = response.headers.get('location');
    const keycloakId = locationHeader?.split('/').pop() ?? '';

    if (!keycloakId) {
      const userId = await this.getUserIdByEmail(token, dto.email);
      if (!userId) {
        throw AppErrorFactory.internalServer({ message: 'User created but ID not found' });
      }
      return userId;
    }

    return keycloakId;
  }

  private async getUserIdByEmail(token: string, email: string): Promise<string | null> {
    const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users?email=${encodeURIComponent(email)}&exact=true`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: 'Failed to fetch user by email' });
    }

    const users = await safeJsonParse<{ id: string }[]>(response);
    return users && users.length > 0 ? users[0].id : null;
  }

  private async createApiUser(dto: RegisterRequestDto, keycloakId: string): Promise<void> {
    const apiUrl = `${this.env.apiBaseUrl}/onboarding/register`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keycloakId,
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
  }
}
