import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CompanyService } from './company.service';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Listar minhas empresas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas do usuário' })
  async listMyCompanies(@Req() req: any) {
    const userId = req.headers['x-user-id'];
    return this.companyService.listUserCompanies(userId);
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Detalhes da empresa' })
  @ApiResponse({ status: 200, description: 'Detalhes da empresa' })
  async getCompanyDetails(@Param('companyId') companyId: string) {
    return this.companyService.getCompanyDetails(companyId);
  }

  @Post(':companyId/addresses')
  @ApiOperation({ summary: 'Adicionar endereço à empresa' })
  @ApiResponse({ status: 201, description: 'Endereço adicionado' })
  async addAddress(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    return this.companyService.addAddress(companyId, body);
  }

  @Post(':companyId/members')
  @ApiOperation({ summary: 'Adicionar membro à empresa' })
  @ApiResponse({ status: 201, description: 'Membro adicionado' })
  async addMember(
    @Param('companyId') companyId: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.companyService.addMember(companyId, body);
  }

  @Post(':companyId/providers')
  @ApiOperation({ summary: 'Adicionar provedor à empresa' })
  @ApiResponse({ status: 201, description: 'Provedor adicionado' })
  async addProvider(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    return this.companyService.addProvider(companyId, body);
  }
}
