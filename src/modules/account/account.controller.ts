import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { AUTH_ERROR_CONFIGS } from '@modules/error/configs/auth-error.config';

import { AccountService } from './account.service';

class UpdateNameDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;
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

@ApiTags('Account')
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

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
  async updateName(
    @Headers('authorization') authorization: string,
    @Body() body: UpdateNameDto,
  ) {
    return this.accountService.updateName(this.extractKeycloakId(authorization), {
      fullName: body.fullName,
    });
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
