import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { AUTH_ERROR_CONFIGS } from '@modules/error/configs/auth-error.config';

import { AuthService } from './auth.service';
import type {
  LoginParams,
  LoginResult,
  RefreshTokenParams,
  LogoutParams,
  SelfUnlockInitiateResult,
  SelfUnlockVerifyResult,
  CreateProviderServiceParams,
  UpdateProviderServiceParams,
} from './dtos/auth.types';
import { ForgotPasswordRequestDto } from './dtos/forgot-password-request.dto';
import { SelfUnlockVerifyRequestDto } from './dtos/self-unlock-verify-request.dto';
import { TermsService } from './terms.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly termsService: TermsService,
  ) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login ou refresh de token via Keycloak' })
  @ApiResponse({ status: 200, description: 'Tokens retornados com sucesso.' })
  @TraceMethod()
  async token(@Body() body: LoginParams | RefreshTokenParams): Promise<LoginResult> {
    if ('refreshToken' in body && !('password' in body)) {
      return this.authService.refreshToken(body);
    }
    return this.authService.login(body as LoginParams);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra sessão do usuário no Keycloak' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso.' })
  @TraceMethod()
  async logout(@Body() body: LogoutParams): Promise<void> {
    await this.authService.logout(body);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recuperação de senha',
    description: 'Dispara um e-mail de redefinição de senha via Keycloak.',
  })
  @ApiResponse({ status: 200, description: 'E-mail de recuperação disparado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @TraceMethod()
  async forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    await this.authService.forgotPassword({ email: body.email });
  }

  @Get('terms/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter versão atual dos termos' })
  @ApiResponse({ status: 200, description: 'Versão atual dos termos.' })
  @TraceMethod()
  async getCurrentTerms() {
    return this.termsService.getCurrentVersion();
  }

  @Get('terms/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas as versões dos termos' })
  @ApiResponse({ status: 200, description: 'Lista de versões dos termos.' })
  @TraceMethod()
  async listTermsVersions() {
    return this.termsService.listVersions();
  }

  @Post('terms/check-pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar se há termos pendentes' })
  @ApiResponse({ status: 200, description: 'Status de pendência dos termos.' })
  @TraceMethod()
  async checkPendingTerms(@Body() body: { userId: string }) {
    return this.termsService.checkPending(body.userId);
  }

  @Post('terms/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceitar termos de uso' })
  @ApiResponse({ status: 200, description: 'Termos aceitos com sucesso.' })
  @TraceMethod()
  async acceptTerms(@Body() body: { userId: string; termsVersionId?: string }) {
    return this.termsService.acceptTerms(body.userId, body.termsVersionId);
  }

  @Get('verification-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter status de verificação do usuário' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Status de verificação do usuário.' })
  @TraceMethod()
  async getVerificationStatus(@Headers('authorization') authorization: string) {
    return this.authService.getVerificationStatus(this.extractKeycloakId(authorization));
  }

  @Get('account-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter status da conta do usuário' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Status da conta do usuário.' })
  @TraceMethod()
  async getAccountStatus(@Headers('authorization') authorization: string) {
    return this.authService.getAccountStatus(this.extractKeycloakId(authorization));
  }

  @Get('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar documentos do usuário' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Lista de documentos do usuário.' })
  @TraceMethod()
  async getDocuments(@Headers('authorization') authorization: string) {
    return this.authService.getDocuments(this.extractKeycloakId(authorization));
  }

  @Post('account-block/:blockId/self-unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar auto-desbloqueio de conta' })
  @ApiParam({ name: 'blockId', description: 'ID do bloqueio de conta' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({
    status: 200,
    description: 'Código de desbloqueio enviado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Código enviado para seu e-mail' },
        destination: { type: 'string', example: 'a***@gmail.com' },
        expiresIn: { type: 'number', example: 300 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  @ApiResponse({ status: 400, description: 'Bloqueio não é auto-desbloqueável' })
  @TraceMethod()
  async initiateSelfUnlock(
    @Param('blockId') blockId: string,
    @Headers('authorization') authorization: string,
  ): Promise<SelfUnlockInitiateResult> {
    return this.authService.initiateSelfUnlock({
      blockId,
      keycloakId: this.extractKeycloakId(authorization),
    });
  }

  @Post('account-block/:blockId/self-unlock/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código de auto-desbloqueio' })
  @ApiParam({ name: 'blockId', description: 'ID do bloqueio de conta' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({
    status: 200,
    description: 'Resultado da verificação do código',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        blockResolved: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Conta desbloqueada com sucesso' },
        canRetryAt: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Código expirado ou tentativas esgotadas' })
  @TraceMethod()
  async verifySelfUnlock(
    @Param('blockId') blockId: string,
    @Body() body: SelfUnlockVerifyRequestDto,
    @Headers('authorization') authorization: string,
  ): Promise<SelfUnlockVerifyResult> {
    return this.authService.verifySelfUnlock({
      blockId,
      code: body.code,
      keycloakId: this.extractKeycloakId(authorization),
    });
  }

  // Provider Profile Endpoints

  @Get('services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar serviços do catálogo' })
  @ApiResponse({ status: 200, description: 'Lista de serviços.' })
  @TraceMethod()
  async getServices() {
    return this.authService.getServices();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova categoria' })
  @ApiResponse({ status: 201, description: 'Categoria criada.' })
  @TraceMethod()
  async createCategory(@Body() body: { name: string; slug: string }) {
    return this.authService.createCategory(body);
  }

  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo serviço no catálogo' })
  @ApiResponse({ status: 201, description: 'Serviço criado.' })
  @TraceMethod()
  async createServiceCatalog(
    @Body() body: { name: string; categoryId: string; description?: string },
  ) {
    return this.authService.createServiceCatalog(body);
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar categorias de serviços' })
  @ApiResponse({ status: 200, description: 'Lista de categorias.' })
  @TraceMethod()
  async getCategories() {
    return this.authService.getCategories();
  }

  @Post('providers/me/services')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar serviço prestador' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso.' })
  @TraceMethod()
  async createProviderService(
    @Body() body: CreateProviderServiceParams,
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.createProviderService(body, this.extractKeycloakId(authorization));
  }

  @Get('providers/me/services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar serviços do prestador' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Lista de serviços.' })
  @TraceMethod()
  async getProviderServices(@Headers('authorization') authorization: string) {
    return this.authService.getProviderServices(this.extractKeycloakId(authorization));
  }

  @Put('providers/me/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar serviço prestador' })
  @ApiParam({ name: 'serviceId', description: 'ID do serviço' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado.' })
  @TraceMethod()
  async updateProviderService(
    @Param('serviceId') serviceId: string,
    @Body() body: UpdateProviderServiceParams,
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.updateProviderService(
      serviceId,
      body,
      this.extractKeycloakId(authorization),
    );
  }

  @Delete('providers/me/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deletar serviço prestador' })
  @ApiParam({ name: 'serviceId', description: 'ID do serviço' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Serviço deletado.' })
  @TraceMethod()
  async deleteProviderService(
    @Param('serviceId') serviceId: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.deleteProviderService(serviceId, this.extractKeycloakId(authorization));
  }

  @Post('providers/me/availability')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Definir disponibilidade do prestador' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 201, description: 'Disponibilidade definida.' })
  @TraceMethod()
  async setProviderAvailability(
    @Body()
    body: { dayOfWeek: number; startTime: string; endTime: string; additionalPercentage?: number },
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.setProviderAvailability(body, this.extractKeycloakId(authorization));
  }

  @Get('providers/me/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar disponibilidade do prestador' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Lista de horários.' })
  @TraceMethod()
  async getProviderAvailability(@Headers('authorization') authorization: string) {
    return this.authService.getProviderAvailability(this.extractKeycloakId(authorization));
  }

  @Put('providers/me/availability/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar faixa de disponibilidade do prestador' })
  @ApiParam({ name: 'id', description: 'ID da faixa de disponibilidade' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Disponibilidade atualizada.' })
  @TraceMethod()
  async updateProviderAvailability(
    @Param('id') id: string,
    @Body() body: { startTime: string; endTime: string; additionalPercentage?: number },
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.updateProviderAvailability(
      {
        id,
        startTime: body.startTime,
        endTime: body.endTime,
        additionalPercentage: body.additionalPercentage,
      },
      this.extractKeycloakId(authorization),
    );
  }

  @Delete('providers/me/availability/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover faixa de disponibilidade do prestador' })
  @ApiParam({ name: 'id', description: 'ID da faixa de disponibilidade' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Disponibilidade removida.' })
  @TraceMethod()
  async deleteProviderAvailability(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.deleteProviderAvailability(id, this.extractKeycloakId(authorization));
  }

  @Get('payment-method-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar tipos de formas de pagamento disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de pagamento.' })
  @TraceMethod()
  async getPaymentMethodTypes() {
    return this.authService.getPaymentMethodTypes();
  }

  @Get('providers/me/payment-methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar formas de pagamento do prestador' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Formas de pagamento do prestador.' })
  @TraceMethod()
  async getProviderPaymentMethods(@Headers('authorization') authorization: string) {
    return this.authService.getProviderPaymentMethods(this.extractKeycloakId(authorization));
  }

  @Put('providers/me/payment-methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Definir formas de pagamento do prestador' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Formas de pagamento atualizadas.' })
  @TraceMethod()
  async setProviderPaymentMethods(
    @Body()
    body: { methods: { paymentMethodTypeId: string; details: Record<string, unknown> | null }[] },
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.setProviderPaymentMethods(body, this.extractKeycloakId(authorization));
  }

  @Get('providers/me/pix-key/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar disponibilidade de chave PIX' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Resultado da verificação.' })
  @TraceMethod()
  async checkPixKeyAvailability(
    @Query('key') key: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.checkPixKeyAvailability(key, this.extractKeycloakId(authorization));
  }

  private extractKeycloakId(authorization: string | undefined): string {
    const token = authorization?.split(' ')[1];
    if (!token) {
      throw AppErrorFactory.authentication(AUTH_ERROR_CONFIGS.missingAuthorizationHeader());
    }
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      if (!payload?.sub) throw new Error('sub ausente no token');
      return payload.sub as string;
    } catch {
      throw AppErrorFactory.authentication(AUTH_ERROR_CONFIGS.tokenInvalid());
    }
  }
}
