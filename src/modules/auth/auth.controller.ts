import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { TermsService } from './terms.service';
import { ForgotPasswordRequestDto } from './dtos/forgot-password-request.dto';

@ApiTags('Auth')
@Controller('bff/auth')
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
  async forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    await this.authService.forgotPassword(body.email);
  }

  @Get('terms/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter versão atual dos termos' })
  @ApiResponse({ status: 200, description: 'Versão atual dos termos.' })
  async getCurrentTerms() {
    return this.termsService.getCurrentVersion();
  }

  @Get('terms/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas as versões dos termos' })
  @ApiResponse({ status: 200, description: 'Lista de versões dos termos.' })
  async listTermsVersions() {
    return this.termsService.listVersions();
  }

  @Post('terms/check-pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar se há termos pendentes' })
  @ApiResponse({ status: 200, description: 'Status de pendência dos termos.' })
  async checkPendingTerms(@Body() body: { userId: string }) {
    return this.termsService.checkPending(body.userId);
  }

  @Post('terms/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceitar termos de uso' })
  @ApiResponse({ status: 200, description: 'Termos aceitos com sucesso.' })
  async acceptTerms(@Body() body: { userId: string; termsVersionId?: string }) {
    return this.termsService.acceptTerms(body.userId, body.termsVersionId);
  }
}
