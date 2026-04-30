import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { DocumentService } from './document.service';
import { CepService } from './cep.service';
import { ForgotPasswordRequestDto } from './dtos/forgot-password-request.dto';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';
import { UploadDocumentResponseDto } from './dtos/upload-document-response.dto';
import { CepResponseDto } from './dtos/cep-response.dto';

@ApiTags('Auth')
@Controller('bff/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
    private readonly verificationService: VerificationService,
    private readonly documentService: DocumentService,
    private readonly cepService: CepService,
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

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registro de usuário',
    description: 'Cria usuário no Keycloak e na API. Retorna sucesso.',
  })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.', type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso.' })
  async register(@Body() body: RegisterRequestDto): Promise<RegisterResponseDto> {
    return this.registrationService.register(body);
  }

  @Post('verification/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar código de verificação',
    description: 'Envia código por email ou SMS. QA mode: 0000 para email, últimos 4 dígitos do phone para SMS.',
  })
  @ApiResponse({ status: 200, description: 'Código enviado com sucesso.', type: VerificationResponseDto })
  async sendVerification(@Body() body: VerificationSendRequestDto): Promise<VerificationResponseDto> {
    return this.verificationService.sendCode(body);
  }

  @Post('verification/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código',
    description: 'Valida o código de verificação recebido.',
  })
  @ApiResponse({ status: 200, description: 'Verificação realizada.', type: VerificationResponseDto })
  async verifyCode(@Body() body: VerificationVerifyRequestDto): Promise<VerificationResponseDto> {
    return this.verificationService.verifyCode(body);
  }

  @Post('documents/upload/:userId')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload de documento',
    description: 'Envia documento para a API (proxy).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Documento enviado com sucesso.', type: UploadDocumentResponseDto })
  async uploadDocument(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('documentType') documentType: string,
  ): Promise<UploadDocumentResponseDto> {
    return this.documentService.uploadDocument(userId, file, documentType);
  }

  @Get('cep/:cep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consulta CEP',
    description: 'Consulta endereço via ViaCEP + geocoding.',
  })
  @ApiResponse({ status: 200, description: 'CEP encontrado.', type: CepResponseDto })
  @ApiResponse({ status: 400, description: 'CEP inválido ou não encontrado.' })
  async lookupCep(@Param('cep') cep: string): Promise<CepResponseDto> {
    return this.cepService.lookupCep(cep);
  }
}
