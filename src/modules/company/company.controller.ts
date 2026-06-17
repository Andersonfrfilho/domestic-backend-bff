import { Controller, Get, Post, Put, Param, Body, Headers } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';
import { AppErrorFactory } from '@modules/error/app.error.factory';
import { AUTH_ERROR_CONFIGS } from '@modules/error/configs/auth-error.config';

import { CompanyService } from './company.service';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Listar minhas empresas' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Lista de empresas do usuário' })
  @TraceMethod()
  async listMyCompanies(@Headers('authorization') authorization: string) {
    const keycloakId = this.extractKeycloakId(authorization);
    return this.companyService.listUserCompanies(keycloakId);
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Detalhes da empresa' })
  @ApiResponse({ status: 200, description: 'Detalhes da empresa' })
  @TraceMethod()
  async getCompanyDetails(@Param('companyId') companyId: string) {
    return this.companyService.getCompanyDetails(companyId);
  }

  @Post(':companyId/addresses')
  @ApiOperation({ summary: 'Adicionar endereço à empresa' })
  @ApiResponse({ status: 201, description: 'Endereço adicionado' })
  @TraceMethod()
  async addAddress(@Param('companyId') companyId: string, @Body() body: any) {
    return this.companyService.addAddress(companyId, body);
  }

  @Post(':companyId/members')
  @ApiOperation({ summary: 'Adicionar membro à empresa' })
  @ApiResponse({ status: 201, description: 'Membro adicionado' })
  @TraceMethod()
  async addMember(
    @Param('companyId') companyId: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.companyService.addMember(companyId, body);
  }

  @Post(':companyId/providers')
  @ApiOperation({ summary: 'Adicionar provedor à empresa' })
  @ApiResponse({ status: 201, description: 'Provedor adicionado' })
  @TraceMethod()
  async addProvider(@Param('companyId') companyId: string, @Body() body: any) {
    return this.companyService.addProvider(companyId, body);
  }

  @Put(':companyId')
  @ApiOperation({ summary: 'Atualizar dados da empresa (somente ADMIN)' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Empresa atualizada' })
  @TraceMethod()
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() body: {
      companyName?: string;
      tradeName?: string | null;
      email?: string;
      phone?: string;
      stateRegistration?: string | null;
      municipalRegistration?: string | null;
    },
    @Headers('authorization') authorization: string,
  ) {
    return this.companyService.updateCompany(companyId, body, this.extractKeycloakId(authorization));
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
