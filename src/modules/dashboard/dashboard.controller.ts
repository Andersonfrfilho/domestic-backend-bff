import { Controller, Get, Headers } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiSecurity('kong-user-id')
@Controller('bff/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('contractor')
  @ApiOperation({
    summary: 'Dashboard do contratante',
    description: 'Agrega solicitações ativas, pendentes, histórico e contagem de notificações não lidas. Cache 1min.',
  })
  getContractorDashboard(@Headers() headers: Record<string, string>) {
    const userId = headers['x-user-id'] ?? '';
    return this.service.getContractorDashboard(userId, headers);
  }

  @Get('provider')
  @ApiOperation({
    summary: 'Dashboard do prestador',
    description: 'Agrega solicitações pendentes de resposta, em andamento, rating e status de verificação. Cache 1min.',
  })
  getProviderDashboard(@Headers() headers: Record<string, string>) {
    const userId = headers['x-user-id'] ?? '';
    return this.service.getProviderDashboard(userId, headers);
  }
}
