import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CepService } from './cep.service';
import { DocumentService } from './document.service';
import { FieldVerificationService, RateLimitExceededError } from './field-verification.service';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

import { CepResponseDto } from './dtos/cep-response.dto';
import { FieldVerificationResponseDto } from './dtos/field-verification-response.dto';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';
import { UploadDocumentResponseDto } from './dtos/upload-document-response.dto';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerifyDocumentRequestDto } from './dtos/verify-document-request.dto';
import { VerifyEmailRequestDto } from './dtos/verify-email-request.dto';
import { VerifyPhoneRequestDto } from './dtos/verify-phone-request.dto';

@ApiTags('Onboarding')
@Controller('bff/onboarding')
export class OnboardingController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly verificationService: VerificationService,
    private readonly documentService: DocumentService,
    private readonly cepService: CepService,
    private readonly fieldVerificationService: FieldVerificationService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastro de usuário', description: 'Cria usuário no Keycloak e na API.' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.', type: RegisterResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado.' })
  async register(@Body() body: RegisterRequestDto): Promise<RegisterResponseDto> {
    return this.registrationService.register(body);
  }

  @Post('verification/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código de verificação', description: 'Envia código por email ou SMS. QA Mode: email=0000, telefone=últimos 4 dígitos.' })
  @ApiResponse({ status: 200, description: 'Código enviado.', type: VerificationResponseDto })
  async sendVerification(@Body() body: VerificationSendRequestDto): Promise<VerificationResponseDto> {
    return this.verificationService.sendCode(body);
  }

  @Post('verification/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código', description: 'Valida o código de verificação enviado.' })
  @ApiResponse({ status: 200, description: 'Código verificado.', type: VerificationResponseDto })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado.' })
  async verifyCode(@Body() body: VerificationVerifyRequestDto): Promise<VerificationResponseDto> {
    return this.verificationService.verifyCode(body);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de documento', description: 'Envia documento de verificação (RG, CNH, comprovante).' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', description: 'Tipo do documento (CPF, CNH, COMPROVANTE_RESIDENCIA, etc)' },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({ status: 200, description: 'Documento enviado.', type: UploadDocumentResponseDto })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
  ): Promise<UploadDocumentResponseDto> {
    return this.documentService.uploadDocument('', file, documentType);
  }

  @Get('cep/:cep')
  @ApiOperation({ summary: 'Consulta CEP', description: 'Busca endereço pelo CEP via ViaCEP + geocoding.' })
  @ApiParam({ name: 'cep', description: 'CEP com 8 dígitos', example: '01001000' })
  @ApiResponse({ status: 200, description: 'Endereço encontrado.', type: CepResponseDto })
  @ApiResponse({ status: 404, description: 'CEP não encontrado.' })
  async lookupCep(@Param('cep') cep: string): Promise<CepResponseDto> {
    return this.cepService.lookupCep(cep);
  }

  @Post('verify/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email', description: 'Valida se email está disponível para cadastro.' })
  @ApiResponse({ status: 200, description: 'Email disponível.', type: FieldVerificationResponseDto })
  @ApiResponse({ status: 409, description: 'Email já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  async verifyEmail(
    @Req() req: Request,
    @Body() body: VerifyEmailRequestDto,
  ): Promise<FieldVerificationResponseDto> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.fieldVerificationService.verifyEmail(ip, body.email);
  }

  @Post('verify/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar telefone', description: 'Valida se telefone está disponível para cadastro.' })
  @ApiResponse({ status: 200, description: 'Telefone disponível.', type: FieldVerificationResponseDto })
  @ApiResponse({ status: 409, description: 'Telefone já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  async verifyPhone(
    @Req() req: Request,
    @Body() body: VerifyPhoneRequestDto,
  ): Promise<FieldVerificationResponseDto> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.fieldVerificationService.verifyPhone(ip, body.phone);
  }

  @Post('verify/document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar documento', description: 'Valida se CPF ou CNPJ está disponível e é válido.' })
  @ApiResponse({ status: 200, description: 'Documento disponível.', type: FieldVerificationResponseDto })
  @ApiResponse({ status: 409, description: 'Documento já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  async verifyDocument(
    @Req() req: Request,
    @Body() body: VerifyDocumentRequestDto,
  ): Promise<FieldVerificationResponseDto> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.fieldVerificationService.verifyDocument(ip, body.document);
  }
}
