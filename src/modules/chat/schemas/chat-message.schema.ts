import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ collection: 'chat_messages', timestamps: true })
export class ChatMessage {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChatRoom', required: true, index: true })
  room_id: Types.ObjectId;

  @Prop({ required: true, index: true })
  sender_id: string;

  @Prop({ required: true, maxlength: 2000 })
  content: string;

  @Prop({ default: false })
  read: boolean;

  // timestamps: createdAt, updatedAt gerados automaticamente
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ room_id: 1, createdAt: -1 });
