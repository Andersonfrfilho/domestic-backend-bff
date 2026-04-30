import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(KEYCLOAK_ADMIN_SERVICE)
    private readonly keycloakAdmin: KeycloakAdminService,
    @Inject(API_CLIENT_SERVICE)
    private readonly apiClient: ApiClientService,
    private readonly configService: ConfigService,
  ) {
    this.clientId =
      this.configService.get<string>(ENV_VARS.KEYCLOAK_CLIENT_ID) ?? 'domestic-backend-bff';
    this.clientSecret =
      this.configService.get<string>(ENV_VARS.KEYCLOAK_CLIENT_SECRET) ??
      'backend-bff-client-secret';
  }

  async register(params: RegisterRequestDto): Promise<RegisterResponseDto> {
    this.logger.log('Registration started', { email: params.email });

    let adminToken: string;

    try {
      const tokenResult = await this.keycloakAdmin.getAdminToken({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });
      adminToken = tokenResult.accessToken;
    } catch (error) {
      this.logger.error('Failed to obtain Keycloak admin token', { error });
      throw AppErrorFactory.internalServer({
        message: 'Serviço de autenticação indisponível',
        code: REGISTRATION_ERROR_CODES.KEYCLOAK_UNAVAILABLE,
      });
    }

    const existingUser = await this.keycloakAdmin.findUserByEmail({
      email: params.email,
      adminToken,
    });

    if (existingUser.exists) {
      throw AppErrorFactory.conflict({
        message: 'Este email já está cadastrado',
        code: REGISTRATION_ERROR_CODES.EMAIL_ALREADY_EXISTS,
        details: { email: params.email },
      });
    }

    const [firstName, ...lastNameParts] = params.fullName.trim().split(' ');

    let keycloakUserId: string;

    try {
      const result = await this.keycloakAdmin.createUser({
        email: params.email,
        phone: params.phone,
        document: params.document,
        cep: params.cep,
        street: params.street,
        number: params.number,
        neighborhood: params.neighborhood,
        city: params.city,
        state: params.state,
        password: params.password,
        firstName,
        lastName: lastNameParts.join(' ') || '',
        adminToken,
      });
      keycloakUserId = result.userId;
      this.logger.log('Keycloak user created', { keycloakUserId });
    } catch (error) {
      this.logger.error('Failed to create Keycloak user', { error });
      throw AppErrorFactory.internalServer({
        message: 'Falha ao criar conta. Tente novamente.',
        code: REGISTRATION_ERROR_CODES.REGISTRATION_FAILED,
      });
    }

    try {
      await this.keycloakAdmin.assignRealmRole({
        userId: keycloakUserId,
        roleName: params.userType,
        adminToken,
      });
      this.logger.log('Realm role assigned', { keycloakUserId, role: params.userType });
    } catch (error) {
      this.logger.error('Failed to assign role, rolling back Keycloak user', { error });
      await this.keycloakAdmin.deleteUser({ userId: keycloakUserId, adminToken });
      throw AppErrorFactory.internalServer({
        message: 'Falha ao criar conta. Tente novamente.',
        code: REGISTRATION_ERROR_CODES.REGISTRATION_FAILED,
      });
    }

    try {
      await this.apiClient.post({
        path: API_USER_ENDPOINT,
        body: {
          fullName: params.fullName,
          email: params.email,
          phone: params.phone,
          document: params.document,
          keycloakId: keycloakUserId,
          userType: params.userType,
          address: {
            cep: params.cep,
            street: params.street,
            number: params.number,
            neighborhood: params.neighborhood,
            city: params.city,
            state: params.state,
          },
          status: 'PENDING',
        },
      });
      this.logger.log('Local user created via API', { keycloakUserId });
    } catch (error) {
      this.logger.error('Failed to create local user, rolling back Keycloak user', { error });
      await this.keycloakAdmin.deleteUser({ userId: keycloakUserId, adminToken });
      throw AppErrorFactory.internalServer({
        message: 'Falha ao criar conta. Tente novamente.',
        code: REGISTRATION_ERROR_CODES.REGISTRATION_FAILED,
      });
    }

    this.logger.log('Registration complete', { keycloakUserId, email: params.email });

    return {
      message: 'Conta criada com sucesso. Verifique seu email para ativar.',
    };
  }

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

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  private async getUserIdByEmail(token: string, email: string): Promise<string | null> {
    const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users?email=${email}&exact=true`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user by email');
    }

    const users = (await response.json()) as { id: string }[];
    return users.length > 0 ? users[0].id : null;
  }

  private async triggerResetPasswordEmail(token: string, userId: string): Promise<void> {
    const url = `${this.env.keycloakBaseUrl}/admin/realms/${this.env.keycloakRealm}/users/${userId}/execute-actions-email`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['UPDATE_PASSWORD']),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger reset password email');
    }
  }
}
