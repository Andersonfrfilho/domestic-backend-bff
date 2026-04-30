import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CepService } from './cep.service';
import { DocumentService } from './document.service';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

import { CepResponseDto } from './dtos/cep-response.dto';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';
import { UploadDocumentResponseDto } from './dtos/upload-document-response.dto';
import { VerificationSendRequestDto } from './dtos/verification-send-request.dto';
import { VerificationResponseDto } from './dtos/verification-response.dto';
import { VerificationVerifyRequestDto } from './dtos/verification-verify-request.dto';

@ApiTags('Onboarding')
@Controller('bff/onboarding')
export class OnboardingController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly verificationService: VerificationService,
    private readonly documentService: DocumentService,
    private readonly cepService: CepService,
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
}
