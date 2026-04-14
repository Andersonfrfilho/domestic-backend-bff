import { Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';

import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/chat', cors: { origin: (process.env.WS_CORS_ORIGINS ?? '*').split(',') } })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private subscriber: Redis;

  constructor(
    @Inject(CHAT_SERVICE)
    private readonly chatService: ChatService,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  onModuleInit() {
    this.subscriber = this.cache.createSubscriber();
    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const roomId = channel.replace('chat:', '');
      try {
        const payload = JSON.parse(message) as { event: string; data: unknown };
        this.server.to(roomId).emit(payload.event, payload.data);
      } catch {
        this.logger.warn(`Malformed Redis message on channel ${channel}`);
      }
    });
    this.subscriber.psubscribe('chat:*');
    this.logger.log('ChatGateway subscribed to Redis chat:* channels');
  }

  onModuleDestroy() {
    this.subscriber?.disconnect();
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Missing user authentication' });
      client.disconnect(true);
      return;
    }
    client.data['userId'] = userId;
    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string },
  ) {
    const userId: string = client.data['userId'];
    try {
      await this.chatService.getRoom(payload.room_id, userId);
      await client.join(payload.room_id);
      this.server.to(payload.room_id).emit('user_joined', { room_id: payload.room_id, user_id: userId });
    } catch {
      client.emit('error', { code: 'FORBIDDEN', message: 'Not a participant of this room' });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string },
  ) {
    const userId: string = client.data['userId'];
    client.leave(payload.room_id);
    this.server.to(payload.room_id).emit('user_left', { room_id: payload.room_id, user_id: userId });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string; content: string },
  ) {
    const userId: string = client.data['userId'];
    try {
      await this.chatService.sendMessage(payload.room_id, userId, { content: payload.content });
      // A mensagem já é distribuída via Redis Pub/Sub → onModuleInit listener
    } catch (err) {
      client.emit('error', { code: 'ERROR', message: String(err) });
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string },
  ) {
    const userId: string = client.data['userId'];
    try {
      await this.chatService.markRead(payload.room_id, userId);
    } catch (err) {
      client.emit('error', { code: 'ERROR', message: String(err) });
    }
  }

  private extractUserId(client: Socket): string | null {
    // Kong injeta X-User-Id no handshake via headers ou query param
    const fromHeader = client.handshake.headers['x-user-id'] as string | undefined;
    const fromQuery = client.handshake.query['user_id'] as string | undefined;
    return fromHeader ?? fromQuery ?? null;
  }
}
