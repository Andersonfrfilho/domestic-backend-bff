import { Inject, Injectable } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { AppError } from '@modules/error/app.error';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';
import { ENVIRONMENT_SERVICE_PROVIDER } from '@config/config.token';
import { EnvironmentProvider } from '@config/providers/environment.provider';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { ApiClientService } from '@modules/shared/api-client/api-client.service';

export type AccountStatusResponse = {
  blocked: boolean;
  status: string;
  reason: string | null;
  message: string | null;
};

@Injectable()
export class AuthService {

  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
    @Inject(ENVIRONMENT_SERVICE_PROVIDER) private readonly env: EnvironmentProvider,
    @Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService,
  ) {}

  async forgotPassword(email: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      const userId = await this.getUserIdByEmail(adminToken, email);
      
      if (!userId) {
        throw AppErrorFactory.notFound({ message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' });
      }

      await this.triggerResetPasswordEmail(adminToken, userId);
      this.logProvider.info({ message: `Password reset triggered for user: ${email}`, context: 'AuthService.forgotPassword' });
    } catch (error) {
      this.logProvider.error({ message: `Failed to process forgot password for ${email}: ${error.message}`, context: 'AuthService.forgotPassword' });
      if (error instanceof AppError) throw error;
      throw AppErrorFactory.internalServer({ message: 'Falha ao processar recuperação de senha' });
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
      throw AppErrorFactory.internalServer({ message: 'Failed to obtain Keycloak admin token' });
    }

    const data = await safeJsonParse<{ access_token: string }>(response);
    if (!data?.access_token) {
      throw AppErrorFactory.internalServer({ message: 'Keycloak admin token response missing access_token' });
    }
    return data.access_token;
  }

  private async getUserIdByEmail(token: string, email: string): Promise<string | null> {
    const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users?email=${email}&exact=true`;
    
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

  private async triggerResetPasswordEmail(token: string, userId: string): Promise<void> {
    const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users/${userId}/execute-actions-email`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['UPDATE_PASSWORD']),
    });

    if (!response.ok) {
      throw AppErrorFactory.internalServer({ message: 'Failed to trigger reset password email' });
    }
  }

  async getVerificationStatus(keycloakId: string): Promise<{ emailVerified: boolean; phoneVerified: boolean }> {
    try {
      const adminToken = await this.getAdminToken();
      const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users/${keycloakId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logProvider.warn({ message: `Failed to get user from Keycloak: ${response.status}`, context: 'AuthService.getVerificationStatus' });
        return { emailVerified: false, phoneVerified: false };
      }

      const user = await safeJsonParse<{
        emailVerified: boolean;
        attributes?: Record<string, string[]>;
      }>(response);

      const phoneVerified = user?.attributes?.phoneVerified?.[0] === 'true';

      return {
        emailVerified: user?.emailVerified ?? false,
        phoneVerified,
      };
    } catch (error) {
      this.logProvider.error({ message: `Error getting verification status: ${error.message}`, context: 'AuthService.getVerificationStatus' });
      return { emailVerified: false, phoneVerified: false };
    }
  }

  async getAccountStatus(keycloakId: string): Promise<AccountStatusResponse> {
    try {
      const response = await this.api.get<AccountStatusResponse>({
        path: '/v1/users/me/account-status',
        headers: { 'X-User-Id': keycloakId },
      });
      return response;
    } catch (error) {
      this.logProvider.error({ message: `Error getting account status: ${error.message}`, context: 'AuthService.getAccountStatus' });
      return { blocked: false, status: 'UNKNOWN', reason: null, message: null };
    }
  }
}
