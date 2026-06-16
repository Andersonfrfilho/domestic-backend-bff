import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';

import { CepService } from './cep.service';
import { DocumentService, UploadedFile } from './document.service';
import { AddressRequestDto } from './dtos/address-request.dto';
import { CepResponseDto } from './dtos/cep-response.dto';
import { FieldVerificationResponseDto } from './dtos/field-verification-response.dto';
import { OnboardingStatusResponseDto } from './dtos/onboarding-status-response.dto';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';
import { UploadDocumentResponseDto } from './dtos/upload-document-response.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';
import { VerifyDocumentRequestDto } from './dtos/verify-document-request.dto';
import { VerifyEmailRequestDto } from './dtos/verify-email-request.dto';
import { VerifyPhoneRequestDto } from './dtos/verify-phone-request.dto';
import { FieldVerificationService } from './field-verification.service';
import { OnboardingStatusService } from './onboarding-status.service';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly verificationService: VerificationService,
    private readonly documentService: DocumentService,
    private readonly cepService: CepService,
    private readonly fieldVerificationService: FieldVerificationService,
    private readonly onboardingStatusService: OnboardingStatusService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastro de usuário',
    description: 'Cria usuário no Keycloak e na API.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso.',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado.' })
  @TraceMethod()
  async register(@Body() body: RegisterRequestDto): Promise<RegisterResponseDto> {
    return this.registrationService.register(body);
  }

  @Post('address')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Salvar endereço pós-cadastro',
    description:
      'Persiste o endereço do usuário durante o onboarding. Não requer autenticação — identifica o usuário pelo keycloakId.',
  })
  @ApiResponse({ status: 201, description: 'Endereço salvo.' })
  @TraceMethod()
  async saveAddress(@Body() body: AddressRequestDto): Promise<{ addressId: string }> {
    return this.registrationService.saveAddress(body);
  }

  @Post('verification/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar código de verificação',
    description: 'Envia código por email ou SMS. QA Mode: email=0000, telefone=últimos 4 dígitos.',
  })
  @ApiResponse({ status: 200, description: 'Código enviado.', type: VerificationResponseDto })
  @TraceMethod()
  async sendVerification(
    @Body() body: VerificationSendRequestDto,
  ): Promise<VerificationResponseDto> {
    return this.verificationService.sendCode(body);
  }

  @Post('verification/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código',
    description: 'Valida o código de verificação enviado.',
  })
  @ApiResponse({ status: 200, description: 'Código verificado.', type: VerificationResponseDto })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado.' })
  @TraceMethod()
  async verifyCode(
    @Body() body: VerificationVerifyRequestDto,
    @Headers('authorization') authorization?: string,
  ): Promise<VerificationResponseDto> {
    return this.verificationService.verifyCode(body, authorization);
  }

  @Post('documents/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload de documento',
    description: 'Envia documento de verificação (RG, CNH, comprovante).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: {
          type: 'string',
          description: 'Tipo do documento (CPF, CNH, COMPROVANTE_RESIDENCIA, etc)',
        },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({ status: 200, description: 'Documento enviado.', type: UploadDocumentResponseDto })
  @TraceMethod()
  async uploadDocument(
    @Req() req: FastifyRequest,
    @Headers('x-user-id') keycloakId?: string,
  ): Promise<UploadDocumentResponseDto> {
    let fileBuffer: Buffer | undefined;
    let filename = 'document';
    let mimetype = 'application/octet-stream';
    let documentType = '';
    let documentNumber: string | undefined;

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        filename = part.filename;
        mimetype = part.mimetype;
      } else {
        if (part.fieldname === 'documentType') documentType = part.value as string;
        if (part.fieldname === 'documentNumber') documentNumber = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('Arquivo não enviado');
    }

    const file: UploadedFile = {
      buffer: fileBuffer,
      originalname: filename,
      mimetype,
      fieldname: 'file',
      size: fileBuffer.length,
      encoding: '7bit',
      destination: '',
      filename,
      path: '',
    };

    return this.documentService.uploadDocument(
      keycloakId || '',
      file,
      documentType,
      documentNumber,
    );
  }

  @Get('cep/:cep')
  @ApiOperation({
    summary: 'Consulta CEP',
    description: 'Busca endereço pelo CEP via ViaCEP + geocoding.',
  })
  @ApiParam({ name: 'cep', description: 'CEP com 8 dígitos', example: '01001000' })
  @ApiResponse({ status: 200, description: 'Endereço encontrado.', type: CepResponseDto })
  @ApiResponse({ status: 404, description: 'CEP não encontrado.' })
  @TraceMethod()
  async lookupCep(@Param('cep') cep: string): Promise<CepResponseDto> {
    return this.cepService.lookupCep(cep);
  }

  @Post('verify/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar email',
    description: 'Valida se email está disponível para cadastro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email disponível.',
    type: FieldVerificationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  @TraceMethod()
  async verifyEmail(@Body() body: VerifyEmailRequestDto): Promise<FieldVerificationResponseDto> {
    return this.fieldVerificationService.verifyEmail(body.email);
  }

  @Post('verify/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar telefone',
    description: 'Valida se telefone está disponível para cadastro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Telefone disponível.',
    type: FieldVerificationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Telefone já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  @TraceMethod()
  async verifyPhone(@Body() body: VerifyPhoneRequestDto): Promise<FieldVerificationResponseDto> {
    return this.fieldVerificationService.verifyPhone(body.phone);
  }

  @Post('verify/document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar documento',
    description: 'Valida se CPF ou CNPJ está disponível.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento disponível.',
    type: FieldVerificationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Documento já cadastrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  @TraceMethod()
  async verifyDocument(
    @Body() body: VerifyDocumentRequestDto,
  ): Promise<FieldVerificationResponseDto> {
    return this.fieldVerificationService.verifyDocument(body.document);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Status do onboarding',
    description:
      'Retorna a etapa pendente do onboarding do usuário autenticado. Requer JWT via Kong.',
  })
  @ApiResponse({ status: 200, description: 'Status calculado.', type: OnboardingStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @TraceMethod()
  async getOnboardingStatus(
    @Headers('x-user-id') keycloakId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<OnboardingStatusResponseDto> {
    if (!keycloakId) {
      throw new UnauthorizedException('x-user-id header ausente');
    }
    const accessToken = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    return this.onboardingStatusService.getStatus(keycloakId, accessToken);
  }
}
