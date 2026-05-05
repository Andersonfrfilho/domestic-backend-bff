import { Inject, Injectable } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@adatechnology/logger';
import { AppError } from '@modules/error/app.error';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { safeJsonParse } from '@modules/shared/utils/safe-json-parse';
import { EnvironmentProvider } from '@config/providers/environment.provider';

@Injectable()
export class AuthService {

  constructor(
    @Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface,
    private readonly env: EnvironmentProvider,
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
}
