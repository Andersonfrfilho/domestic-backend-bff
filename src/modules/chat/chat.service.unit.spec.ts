import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { BffCacheService } from '@modules/shared/cache/bff-cache.service';

import { ChatService } from './chat.service';
import { ChatMessage } from './schemas/chat-message.schema';
import { ChatRoom } from './schemas/chat-room.schema';

const makeRoom = (overrides?: Partial<{ contractor_id: string; provider_id: string }>) => ({
  _id: 'room-1',
  service_request_id: 'sr-1',
  contractor_id: 'user-contractor',
  provider_id: 'user-provider',
  ...overrides,
});

const makeRoomModel = (room: ReturnType<typeof makeRoom> | null) => ({
  findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(room) }) }),
  findById: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(room) }) }),
  find: jest.fn().mockReturnValue({ sort: () => ({ lean: () => ({ exec: () => Promise.resolve([room]) }) }) }),
  create: jest.fn().mockResolvedValue({ toObject: () => room }),
  updateOne: jest.fn().mockResolvedValue(undefined),
});

const makeMessageModel = () => ({
  create: jest.fn().mockResolvedValue({ toObject: () => ({ _id: 'msg-1', content: 'Hi' }) }),
  find: jest.fn().mockReturnValue({
    sort: () => ({ skip: () => ({ limit: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }) }) }),
  }),
  countDocuments: jest.fn().mockResolvedValue(0),
  updateMany: jest.fn().mockResolvedValue(undefined),
});

const makeCache = () => ({
  publish: jest.fn().mockResolvedValue(undefined),
});

describe('ChatService', () => {
  let service: ChatService;
  let roomModel: ReturnType<typeof makeRoomModel>;
  let cache: ReturnType<typeof makeCache>;

  const buildModule = async (room: ReturnType<typeof makeRoom> | null = makeRoom()) => {
    roomModel = makeRoomModel(room);
    cache = makeCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(ChatRoom.name), useValue: roomModel },
        { provide: getModelToken(ChatMessage.name), useValue: makeMessageModel() },
        { provide: BffCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(ChatService);
  };

  it('createRoom returns existing room if already exists', async () => {
    await buildModule();
    const result = await service.createRoom({ service_request_id: 'sr-1' }, 'user-contractor', 'user-provider');
    expect(roomModel.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ service_request_id: 'sr-1' });
  });

  it('createRoom creates new room if not exists', async () => {
    await buildModule(null);
    roomModel.findOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });
    await service.createRoom({ service_request_id: 'sr-new' }, 'user-contractor', 'user-provider');
    expect(roomModel.create).toHaveBeenCalled();
  });

  it('getRoom throws NotFoundException if room does not exist', async () => {
    await buildModule(null);
    await expect(service.getRoom('room-99', 'user-contractor')).rejects.toThrow(NotFoundException);
  });

  it('getRoom throws ForbiddenException if user is not a participant', async () => {
    await buildModule();
    await expect(service.getRoom('room-1', 'user-stranger')).rejects.toThrow(ForbiddenException);
  });

  it('sendMessage publishes to Redis after persisting', async () => {
    await buildModule();
    await service.sendMessage('room-1', 'user-contractor', { content: 'Hello!' });
    expect(cache.publish).toHaveBeenCalledWith('chat:room-1', expect.stringContaining('message_received'));
  });

  it('markRead publishes messages_read event to Redis', async () => {
    await buildModule();
    await service.markRead('room-1', 'user-contractor');
    expect(cache.publish).toHaveBeenCalledWith('chat:room-1', expect.stringContaining('messages_read'));
  });
});
