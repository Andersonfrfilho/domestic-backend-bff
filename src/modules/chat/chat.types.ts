export interface CreateRoomDto {
  service_request_id: string;
}

export interface SendMessageDto {
  content: string;
}

export interface CreateRoomParams {
  dto: CreateRoomDto;
  contractorId: string;
  providerId: string;
}
export type CreateRoomResult = Promise<Record<string, unknown>>;

export interface GetRoomParams {
  roomId: string;
  userId: string;
}
export type GetRoomResult = Promise<Record<string, unknown>>;

export interface GetMessagesParams {
  roomId: string;
  userId: string;
  page?: number;
  limit?: number;
}
export type GetMessagesResult = Promise<{
  data: Record<string, unknown>[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}>;

export interface SendMessageParams {
  roomId: string;
  senderId: string;
  dto: SendMessageDto;
}
export type SendMessageResult = Promise<Record<string, unknown>>;

export interface MarkReadParams {
  roomId: string;
  userId: string;
}
export type MarkReadResult = Promise<void>;
