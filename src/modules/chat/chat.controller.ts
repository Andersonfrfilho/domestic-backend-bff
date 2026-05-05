import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { ApiAlternativeErrorResponses } from '@modules/shared/docs/swagger/swagger-error-responses.decorator';

import type { CreateRoomDto, SendMessageDto } from './chat.service';
import { ChatService } from './chat.service';
import { CHAT_SERVICE } from './chat.token';

@ApiTags('Chat')
@ApiSecurity('kong-user-id')
@Controller('/chat')
export class ChatController {
  constructor(@Inject(CHAT_SERVICE) private readonly service: ChatService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Cria sala de chat vinculada a uma service_request' })
  @ApiBody({ schema: { example: { serviceRequestId: 'uuid', providerId: 'uuid' } } })
  @ApiOkResponse({
    description: 'Sala criada (ou retornada, caso já exista para a service_request)',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '6803f4aab9810f4f4e9b3456' },
        serviceRequestId: { type: 'string', example: 'uuid' },
        contractorId: { type: 'string', example: 'user-keycloak-id' },
        providerId: { type: 'string', example: 'provider-keycloak-id' },
        lastMessageAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
        },
        lastMessagePreview: {
          type: 'string',
          nullable: true,
          example: null,
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T12:30:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T12:30:00.000Z',
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({ badRequest: true, unauthorized: true, forbidden: true })
  createRoom(
    @Body()
    body: (CreateRoomDto & { provider_id?: string }) & {
      serviceRequestId?: string;
      providerId?: string;
    },
    @Headers() headers: Record<string, string>,
  ) {
    const contractorId = headers['x-user-id'] ?? '';
    const serviceRequestId = (body as any).serviceRequestId ?? (body as any).service_request_id;
    const providerId = (body as any).providerId ?? (body as any).provider_id;
    return this.service.createRoom({
      dto: { service_request_id: serviceRequestId },
      contractorId,
      providerId,
    });
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Lista salas do usuário autenticado' })
  @ApiOkResponse({
    description: 'Lista de salas onde o usuário é participante',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6803f4aab9810f4f4e9b3456' },
          serviceRequestId: { type: 'string', example: 'uuid' },
          contractorId: { type: 'string', example: 'user-keycloak-id' },
          providerId: { type: 'string', example: 'provider-keycloak-id' },
          lastMessageAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-04-15T12:45:00.000Z',
          },
          lastMessagePreview: {
            type: 'string',
            nullable: true,
            example: 'Oi! Tudo bem para amanhã?',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-04-15T12:30:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-04-15T12:45:00.000Z',
          },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true })
  listRooms(@Headers() headers: Record<string, string>) {
    const userId = headers['x-user-id'] ?? '';
    return this.service.listRooms(userId);
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Detalhe de uma sala' })
  @ApiParam({ name: 'roomId', description: 'ObjectId da sala' })
  @ApiOkResponse({
    description: 'Detalhe da sala',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '6803f4aab9810f4f4e9b3456' },
        serviceRequestId: { type: 'string', example: 'uuid' },
        contractorId: { type: 'string', example: 'user-keycloak-id' },
        providerId: { type: 'string', example: 'provider-keycloak-id' },
        lastMessageAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2026-04-15T12:45:00.000Z',
        },
        lastMessagePreview: {
          type: 'string',
          nullable: true,
          example: 'Oi! Tudo bem para amanhã?',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T12:30:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T12:45:00.000Z',
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  getRoom(@Param('roomId') roomId: string, @Headers() headers: Record<string, string>) {
    return this.service.getRoom({ roomId, userId: headers['x-user-id'] ?? '' });
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Histórico de mensagens paginado' })
  @ApiParam({ name: 'roomId', description: 'ObjectId da sala' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({
    description: 'Mensagens paginadas da sala',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '6803f5a9b9810f4f4e9b3457' },
              roomId: { type: 'string', example: '6803f4aab9810f4f4e9b3456' },
              senderId: { type: 'string', example: 'user-keycloak-id' },
              content: { type: 'string', example: 'Olá! Consegue atender amanhã às 10h?' },
              read: { type: 'boolean', example: false },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-15T12:45:00.000Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2026-04-15T12:45:00.000Z',
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 50 },
            total: { type: 'number', example: 12 },
            totalPages: { type: 'number', example: 1 },
          },
        },
        links: {
          type: 'object',
          properties: {
            first: {
              type: 'string',
              nullable: true,
              example:
                'http://localhost:3001/bff/chat/rooms/6803f4aab9810f4f4e9b3456/messages?page=1&limit=50',
            },
            last: {
              type: 'string',
              nullable: true,
              example:
                'http://localhost:3001/bff/chat/rooms/6803f4aab9810f4f4e9b3456/messages?page=1&limit=50',
            },
            next: { type: 'string', nullable: true, example: null },
            previous: { type: 'string', nullable: true, example: null },
          },
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  getMessages(
    @Param('roomId') roomId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Headers() headers: Record<string, string>,
  ) {
    return this.service.getMessages({ roomId, userId: headers['x-user-id'] ?? '', page, limit });
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Envia mensagem na sala (REST fallback — prefira WebSocket)' })
  @ApiParam({ name: 'roomId', description: 'ObjectId da sala' })
  @ApiBody({ schema: { example: { content: 'Posso ir às 10h, combinado!' } } })
  @ApiOkResponse({
    description: 'Mensagem enviada com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '6803f5a9b9810f4f4e9b3457' },
        roomId: { type: 'string', example: '6803f4aab9810f4f4e9b3456' },
        senderId: { type: 'string', example: 'user-keycloak-id' },
        content: { type: 'string', example: 'Posso ir às 10h, combinado!' },
        read: { type: 'boolean', example: false },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T12:45:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-15T12:45:00.000Z',
        },
      },
    },
  })
  @ApiAlternativeErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  sendMessage(
    @Param('roomId') roomId: string,
    @Body() body: SendMessageDto,
    @Headers() headers: Record<string, string>,
  ) {
    return this.service.sendMessage({ roomId, senderId: headers['x-user-id'] ?? '', dto: body });
  }
}
