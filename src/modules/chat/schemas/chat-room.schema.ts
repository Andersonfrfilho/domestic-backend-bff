import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

@Schema({ collection: 'chat_rooms', timestamps: true })
export class ChatRoom {
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  service_request_id: string;

  @Prop({ required: true, index: true })
  contractor_id: string;

  @Prop({ required: true, index: true })
  provider_id: string;

  @Prop({ type: Date, default: null })
  last_message_at: Date | null;

  @Prop({ type: String, default: null, maxlength: 100 })
  last_message_preview: string | null;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// índice composto para buscar salas de um usuário
ChatRoomSchema.index({ contractor_id: 1, last_message_at: -1 });
ChatRoomSchema.index({ provider_id: 1, last_message_at: -1 });
ChatRoomSchema.index({ service_request_id: 1 }, { unique: true });
