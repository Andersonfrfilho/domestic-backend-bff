import { Body, Controller, Get, Headers, Inject, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiClientService } from '@modules/shared/api-client/api-client.service';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';

@ApiTags('Notifications')
@ApiSecurity('kong-user-id')
@Controller('bff/notifications')
export class NotificationController {
  constructor(@Inject(API_CLIENT_SERVICE) private readonly api: ApiClientService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações do usuário autenticado (proxy → API)' })
  list(@Headers() headers: Record<string, string>) {
    return this.api.get('/api/v1/notifications', headers);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contagem de notificações não lidas (proxy → API)' })
  unreadCount(@Headers() headers: Record<string, string>) {
    return this.api.get('/api/v1/notifications/unread-count', headers);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marca uma notificação como lida (proxy → API)' })
  @ApiParam({ name: 'id', description: 'ObjectId da notificação' })
  markRead(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    return this.api.put(`/api/v1/notifications/${id}/read`, {}, headers);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas (proxy → API)' })
  markAllRead(@Body() _body: unknown, @Headers() headers: Record<string, string>) {
    return this.api.put('/api/v1/notifications/read-all', {}, headers);
  }
}
