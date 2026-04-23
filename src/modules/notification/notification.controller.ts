import { Body, Controller, Get, Headers, Inject, Param, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';
import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

@ApiTags('Notifications')
@ApiSecurity('kong-user-id')
@Controller('bff/notifications')
export class NotificationController {
  constructor(@Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações do usuário autenticado (proxy → API)' })
  @ApiOkResponse({
    description: 'Lista de notificações (proxy da API interna)',
    schema: {
      oneOf: [
        { type: 'array', items: { type: 'object', additionalProperties: true } },
        { type: 'object', additionalProperties: true },
      ],
    },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true })
  list(@Headers() headers: Record<string, string>) {
    return this.api.get({ path: '/v1/notifications', headers });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contagem de notificações não lidas (proxy → API)' })
  @ApiOkResponse({
    description: 'Total de notificações não lidas',
    schema: { type: 'object', properties: { count: { type: 'number', example: 5 } } },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true })
  unreadCount(@Headers() headers: Record<string, string>) {
    return this.api.get({ path: '/v1/notifications/unread-count', headers });
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marca uma notificação como lida (proxy → API)' })
  @ApiParam({ name: 'id', description: 'ObjectId da notificação' })
  @ApiOkResponse({
    description: 'Notificação marcada como lida',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiAlternativeErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  markRead(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    return this.api.put({ path: `/v1/notifications/${id}/read`, body: {}, headers });
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas (proxy → API)' })
  @ApiOkResponse({
    description: 'Todas as notificações marcadas como lidas',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true })
  markAllRead(@Body() _body: unknown, @Headers() headers: Record<string, string>) {
    return this.api.put({ path: '/v1/notifications/read-all', body: {}, headers });
  }
}
