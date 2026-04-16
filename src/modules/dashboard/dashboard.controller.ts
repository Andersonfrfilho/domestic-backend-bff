import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

import { DashboardService } from './dashboard.service';
import { DASHBOARD_SERVICE } from './dashboard.token';

@ApiTags('Dashboard')
@ApiSecurity('kong-user-id')
@Controller('bff/dashboard')
export class DashboardController {
  constructor(@Inject(DASHBOARD_SERVICE) private readonly service: DashboardService) {}

  @Get('contractor')
  @ApiOperation({
    summary: 'Dashboard do contratante',
    description:
      'Agrega solicitações ativas, pendentes, histórico e contagem de notificações não lidas. Cache 1min.',
  })
  @ApiOkResponse({
    description: 'Resumo de dados do contratante',
    schema: {
      type: 'object',
      properties: {
        activeRequests: { type: 'array', items: { type: 'object', additionalProperties: true } },
        pendingRequests: { type: 'array', items: { type: 'object', additionalProperties: true } },
        recentHistory: { type: 'array', items: { type: 'object', additionalProperties: true } },
        unreadNotifications: { type: 'number', example: 3 },
      },
    },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true })
  getContractorDashboard(@Headers() headers: Record<string, string>) {
    const userId = headers['x-user-id'] ?? '';
    return this.service.getContractorDashboard({ userId, headers });
  }

  @Get('provider')
  @ApiOperation({
    summary: 'Dashboard do prestador',
    description:
      'Agrega solicitações pendentes de resposta, em andamento, rating e status de verificação. Cache 1min.',
  })
  @ApiOkResponse({
    description: 'Resumo de dados do prestador',
    schema: {
      type: 'object',
      properties: {
        incomingRequests: { type: 'array', items: { type: 'object', additionalProperties: true } },
        activeRequests: { type: 'array', items: { type: 'object', additionalProperties: true } },
        averageRating: { type: 'number', example: 4.8 },
        reviewCount: { type: 'number', example: 102 },
        verificationStatus: { type: 'string', example: 'VERIFIED' },
        unreadNotifications: { type: 'number', example: 2 },
      },
    },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true })
  getProviderDashboard(@Headers() headers: Record<string, string>) {
    const userId = headers['x-user-id'] ?? '';
    return this.service.getProviderDashboard({ userId, headers });
  }
}
