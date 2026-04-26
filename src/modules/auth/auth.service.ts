import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { EnvironmentProvider } from '@config/providers/environment.provider';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly env: EnvironmentProvider) {}

  async forgotPassword(email: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      const userId = await this.getUserIdByEmail(adminToken, email);
      
      if (!userId) {
        throw new NotFoundException('Usuário não encontrado');
      }

      await this.triggerResetPasswordEmail(adminToken, userId);
      this.logger.log(`Password reset triggered for user: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to process forgot password for ${email}: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Falha ao processar recuperação de senha');
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
      throw new Error('Failed to obtain Keycloak admin token');
    }

    const data = await response.json() as { access_token: string };
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
      throw new Error('Failed to fetch user by email');
    }

    const users = await response.json() as { id: string }[];
    return users.length > 0 ? users[0].id : null;
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
      throw new Error('Failed to trigger reset password email');
    }
  }
}
