import {
  BadRequestException,
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
  Req,
} from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { FastifyRequest } from 'fastify';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { AUTH_ERROR_CONFIGS } from '@modules/error/configs/auth-error.config';
import { DocumentService, UploadedFile } from '@modules/onboarding/document.service';
import { FieldVerificationService } from '@modules/onboarding/field-verification.service';

import { AccountService } from './account.service';

class UpdateNameDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;
}

class CheckContactDto {
  @IsString()
  @IsNotEmpty()
  contact: string;
}

class InitiateContactChangeDto {
  @IsString()
  @IsNotEmpty()
  contact: string;
}

class ConfirmContactChangeDto {
  @IsString()
  @IsNotEmpty()
  contactId: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

class SaveAddressDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  postcode: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;
}

@ApiTags('Account')
@Controller('account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly fieldVerificationService: FieldVerificationService,
    private readonly documentService: DocumentService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Perfil do usuário.' })
  @TraceMethod()
  async getProfile(@Headers('authorization') authorization: string) {
    return this.accountService.getProfile(this.extractKeycloakId(authorization));
  }

  @Put('me/name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar nome do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Nome atualizado.' })
  @TraceMethod()
  async updateName(@Headers('authorization') authorization: string, @Body() body: UpdateNameDto) {
    return this.accountService.updateName(this.extractKeycloakId(authorization), {
      fullName: body.fullName,
    });
  }

  @Post('me/email/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar se e-mail já está em uso' })
  @ApiResponse({ status: 200, description: 'E-mail disponível.' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso.' })
  @TraceMethod()
  async checkEmail(@Body() body: CheckContactDto) {
    return this.fieldVerificationService.verifyEmail(body.contact);
  }

  @Post('me/phone/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar se telefone já está em uso' })
  @ApiResponse({ status: 200, description: 'Telefone disponível.' })
  @ApiResponse({ status: 409, description: 'Telefone já está em uso.' })
  @TraceMethod()
  async checkPhone(@Body() body: CheckContactDto) {
    return this.fieldVerificationService.verifyPhone(body.contact);
  }

  @Post('me/email/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar troca de email — envia OTP para o novo email' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'OTP enviado. Retorna contactId.' })
  @TraceMethod()
  async initiateEmailChange(
    @Headers('authorization') authorization: string,
    @Body() body: InitiateContactChangeDto,
  ) {
    return this.accountService.initiateEmailChange(this.extractKeycloakId(authorization), {
      contact: body.contact,
    });
  }

  @Post('me/email/change/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar troca de email com OTP' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Email trocado com sucesso.' })
  @TraceMethod()
  async confirmEmailChange(
    @Headers('authorization') authorization: string,
    @Body() body: ConfirmContactChangeDto,
  ) {
    return this.accountService.confirmEmailChange(this.extractKeycloakId(authorization), {
      contactId: body.contactId,
      code: body.code,
    });
  }

  @Post('me/phone/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar troca de telefone — envia OTP para o novo número' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'OTP enviado. Retorna contactId.' })
  @TraceMethod()
  async initiatePhoneChange(
    @Headers('authorization') authorization: string,
    @Body() body: InitiateContactChangeDto,
  ) {
    return this.accountService.initiatePhoneChange(this.extractKeycloakId(authorization), {
      contact: body.contact,
    });
  }

  @Post('me/phone/change/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar troca de telefone com OTP' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Telefone trocado com sucesso.' })
  @TraceMethod()
  async confirmPhoneChange(
    @Headers('authorization') authorization: string,
    @Body() body: ConfirmContactChangeDto,
  ) {
    return this.accountService.confirmPhoneChange(this.extractKeycloakId(authorization), {
      contactId: body.contactId,
      code: body.code,
    });
  }

  @Get('me/address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar endereços do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Lista de endereços.' })
  @TraceMethod()
  async listAddresses(@Headers('authorization') authorization: string) {
    return this.accountService.listAddresses(this.extractKeycloakId(authorization));
  }

  @Post('me/address')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar endereço ao usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 201, description: 'Endereço criado.' })
  @TraceMethod()
  async createAddress(
    @Headers('authorization') authorization: string,
    @Body() body: SaveAddressDto,
  ) {
    return this.accountService.createAddress(this.extractKeycloakId(authorization), body);
  }

  @Put('me/address/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar endereço do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Endereço atualizado.' })
  @TraceMethod()
  async updateAddress(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: SaveAddressDto,
  ) {
    return this.accountService.updateAddress(this.extractKeycloakId(authorization), id, body);
  }

  @Delete('me/address/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover endereço do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 204, description: 'Endereço removido.' })
  @TraceMethod()
  async deleteAddress(@Headers('authorization') authorization: string, @Param('id') id: string) {
    return this.accountService.deleteAddress(this.extractKeycloakId(authorization), id);
  }

  @Post('me/document')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de documento do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 201, description: 'Documento enviado.' })
  @TraceMethod()
  async uploadDocument(
    @Headers('authorization') authorization: string,
    @Req() req: FastifyRequest,
  ) {
    const keycloakId = this.extractKeycloakId(authorization);

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

    if (!fileBuffer) throw new BadRequestException('Arquivo não enviado');

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

    return this.documentService.uploadDocument(keycloakId, file, documentType, documentNumber);
  }

  @Get('me/documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar documentos do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Lista de documentos.' })
  @TraceMethod()
  async listDocuments(@Headers('authorization') authorization: string) {
    return this.accountService.listDocuments(this.extractKeycloakId(authorization));
  }

  @Delete('me/documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover documento do usuário autenticado' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 204, description: 'Documento removido.' })
  @TraceMethod()
  async deleteDocument(@Headers('authorization') authorization: string, @Param('id') id: string) {
    return this.accountService.deleteDocument(this.extractKeycloakId(authorization), id);
  }

  @Get('me/documents/:id/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter URL assinada de um documento (TTL 15min)' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'URL assinada do documento.' })
  @TraceMethod()
  async getDocumentUrl(@Headers('authorization') authorization: string, @Param('id') id: string) {
    this.extractKeycloakId(authorization);
    return this.accountService.getDocumentUrl(id);
  }

  private extractKeycloakId(authorization: string | undefined): string {
    const token = authorization?.split(' ')[1];
    if (!token) {
      throw AppErrorFactory.authentication(AUTH_ERROR_CONFIGS.missingAuthorizationHeader());
    }
    try {
      const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      if (!payload?.sub) throw new Error('sub ausente no token');
      return payload.sub as string;
    } catch {
      throw AppErrorFactory.authentication(AUTH_ERROR_CONFIGS.tokenInvalid());
    }
  }
}
