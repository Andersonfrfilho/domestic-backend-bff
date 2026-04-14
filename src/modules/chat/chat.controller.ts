import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';

import type { CreateRoomDto, SendMessageDto } from './chat.service';
import { ChatService } from './chat.service';
import { CHAT_SERVICE } from './chat.token';

@ApiTags('Chat')
@ApiSecurity('kong-user-id')
@Controller('bff/chat')
export class ChatController {
  constructor(@Inject(CHAT_SERVICE) private readonly service: ChatService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Cria sala de chat vinculada a uma service_request' })
  @ApiBody({ schema: { example: { service_request_id: 'uuid', provider_id: 'uuid' } } })
  createRoom(
    @Body() body: CreateRoomDto & { provider_id: string },
    @Headers() headers: Record<string, string>,
  ) {
    const contractorId = headers['x-user-id'] ?? '';
    return this.service.createRoom(body, contractorId, body.provider_id);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Lista salas do usuário autenticado' })
  listRooms(@Headers() headers: Record<string, string>) {
    const userId = headers['x-user-id'] ?? '';
    return this.service.listRooms(userId);
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Detalhe de uma sala' })
  @ApiParam({ name: 'roomId', description: 'ObjectId da sala' })
  getRoom(@Param('roomId') roomId: string, @Headers() headers: Record<string, string>) {
    return this.service.getRoom(roomId, headers['x-user-id'] ?? '');
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Histórico de mensagens paginado' })
  @ApiParam({ name: 'roomId', description: 'ObjectId da sala' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMessages(
    @Param('roomId') roomId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Headers() headers: Record<string, string>,
  ) {
    return this.service.getMessages(roomId, headers['x-user-id'] ?? '', page, limit);
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Envia mensagem na sala (REST fallback — prefira WebSocket)' })
  @ApiParam({ name: 'roomId', description: 'ObjectId da sala' })
  sendMessage(
    @Param('roomId') roomId: string,
    @Body() body: SendMessageDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.service.sendMessage(roomId, headers['x-user-id'] ?? '', body);
  }
}
