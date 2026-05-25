import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { AUTH_ERROR_CONFIGS } from '@modules/error/configs/auth-error.config';

import { AuthService } from './auth.service';
import { ForgotPasswordRequestDto } from './dtos/forgot-password-request.dto';
import { TermsService } from './terms.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly termsService: TermsService,
  ) {}

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
    await this.authService.forgotPassword(body.email);
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
