import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiAuthGuard } from '@adatechnology/auth-keycloak';
import { CompanyService } from './company.service';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('me')
  @UseGuards(ApiAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar minhas empresas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas do usuário' })
  async listMyCompanies(@Req() req: any) {
    const userId = req.user?.sub;
    return this.companyService.listUserCompanies(userId);
  }

  @Get(':companyId')
  @UseGuards(ApiAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes da empresa' })
  @ApiResponse({ status: 200, description: 'Detalhes da empresa' })
  async getCompanyDetails(@Param('companyId') companyId: string) {
    return this.companyService.getCompanyDetails(companyId);
  }

  @Post(':companyId/addresses')
  @UseGuards(ApiAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar endereço à empresa' })
  @ApiResponse({ status: 201, description: 'Endereço adicionado' })
  async addAddress(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    return this.companyService.addAddress(companyId, body);
  }

  @Post(':companyId/members')
  @UseGuards(ApiAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar membro à empresa' })
  @ApiResponse({ status: 201, description: 'Membro adicionado' })
  async addMember(
    @Param('companyId') companyId: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.companyService.addMember(companyId, body);
  }

  @Post(':companyId/providers')
  @UseGuards(ApiAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar provedor à empresa' })
  @ApiResponse({ status: 201, description: 'Provedor adicionado' })
  async addProvider(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    return this.companyService.addProvider(companyId, body);
  }
}
