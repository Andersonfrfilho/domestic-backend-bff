import { Injectable, Logger, InternalServerErrorException, ConflictException } from '@nestjs/common';

import { EnvironmentProvider } from '@config/providers/environment.provider';
import { RegistrationServiceInterface } from './interfaces/registration-service.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';

@Injectable()
export class RegistrationService implements RegistrationServiceInterface {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(private readonly env: EnvironmentProvider) {}

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    try {
      const adminToken = await this.getAdminToken();

      const keycloakId = await this.createKeycloakUser(adminToken, dto);

      await this.createApiUser(dto, keycloakId);

      this.logger.log(`User registered successfully: ${dto.email}`);

      return {
        keycloakId,
        email: dto.email,
        success: true,
        message: 'Usuário criado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Failed to register user ${dto.email}: ${error.message}`);

      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        throw new ConflictException('E-mail já está em uso');
      }

      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Falha ao criar usuário');
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
      throw new Error(`Keycloak admin token request failed: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string };
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
      throw new Error(`Keycloak user creation failed: ${response.status} - ${errorText}`);
    }

    const locationHeader = response.headers.get('location');
    const keycloakId = locationHeader?.split('/').pop() ?? '';

    if (!keycloakId) {
      const userId = await this.getUserIdByEmail(token, dto.email);
      if (!userId) {
        throw new Error('User created but ID not found');
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
      throw new Error('Failed to fetch user by email');
    }

    const users = (await response.json()) as { id: string }[];
    return users.length > 0 ? users[0].id : null;
  }

  private async createApiUser(dto: RegisterRequestDto, keycloakId: string): Promise<void> {
    const apiUrl = `${this.env.apiBaseUrl}/users`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keycloakId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        ...(dto.cpf ? { cpf: dto.cpf } : {}),
      }),
    });

    if (!response.ok) {
      this.logger.warn(`API user creation returned ${response.status}, continuing anyway`);
    }
  }
}
