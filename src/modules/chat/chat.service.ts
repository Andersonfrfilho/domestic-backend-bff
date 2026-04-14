import { Inject, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';

import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

export interface CreateRoomDto {
  service_request_id: string;
}

export interface SendMessageDto {
  content: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatRoom.name)
    private readonly roomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  async createRoom(dto: CreateRoomDto, contractorId: string, providerId: string) {
    const existing = await this.roomModel
      .findOne({ service_request_id: dto.service_request_id })
      .lean()
      .exec();

    if (existing) return existing;

    const room = await this.roomModel.create({
      service_request_id: dto.service_request_id,
      contractor_id: contractorId,
      provider_id: providerId,
    });

    return room.toObject();
  }

  async listRooms(userId: string) {
    return this.roomModel
      .find({ $or: [{ contractor_id: userId }, { provider_id: userId }] })
      .sort({ last_message_at: -1 })
      .lean()
      .exec();
  }

  async getRoom(roomId: string, userId: string) {
    const room = await this.roomModel.findById(roomId).lean().exec();
    if (!room) throw new NotFoundException('Room not found');
    this.assertParticipant(room, userId);
    return room;
  }

  async getMessages(roomId: string, userId: string, page = 1, limit = 50) {
    const room = await this.roomModel.findById(roomId).lean().exec();
    if (!room) throw new NotFoundException('Room not found');
    this.assertParticipant(room, userId);

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.messageModel
        .find({ room_id: roomId as unknown as Types.ObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.messageModel.countDocuments({ room_id: roomId as unknown as Types.ObjectId }),
    ]);

    return {
      data: data.reverse(),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(roomId: string, senderId: string, dto: SendMessageDto) {
    const room = await this.roomModel.findById(roomId).lean().exec();
    if (!room) throw new NotFoundException('Room not found');
    this.assertParticipant(room, senderId);

    const message = await this.messageModel.create({
      room_id: roomId as unknown as Types.ObjectId,
      sender_id: senderId,
      content: dto.content.slice(0, 2000),
      read: false,
    });

    // Atualiza preview da sala
    await this.roomModel.updateOne(
      { _id: roomId },
      {
        last_message_at: new Date(),
        last_message_preview: dto.content.slice(0, 100),
      },
    );

    const msg = message.toObject();

    // Publica no Redis para todos os nós BFF
    await this.cache.publish(
      `chat:${roomId}`,
      JSON.stringify({
        event: 'message_received',
        data: { id: String(msg._id), room_id: roomId, sender_id: senderId, content: dto.content, created_at: msg['createdAt'] },
      }),
    );

    return msg;
  }

  async markRead(roomId: string, userId: string) {
    const room = await this.roomModel.findById(roomId).lean().exec();
    if (!room) throw new NotFoundException('Room not found');
    this.assertParticipant(room, userId);

    await this.messageModel.updateMany(
      { room_id: roomId as unknown as Types.ObjectId, sender_id: { $ne: userId }, read: false },
      { read: true },
    );

    await this.cache.publish(
      `chat:${roomId}`,
      JSON.stringify({ event: 'messages_read', data: { room_id: roomId, read_by: userId } }),
    );
  }

  private assertParticipant(room: ChatRoom, userId: string) {
    if (room.contractor_id !== userId && room.provider_id !== userId) {
      throw new ForbiddenException('Not a participant of this room');
    }
  }
}
