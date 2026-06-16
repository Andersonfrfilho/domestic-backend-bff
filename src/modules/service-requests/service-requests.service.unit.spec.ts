import { Test, TestingModule } from '@nestjs/testing';

import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';

import { ServiceRequestsService } from './service-requests.service';
import type { ServiceRequestResult } from './dtos/service-requests.types';

const makeLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeApi = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
});

const makeServiceRequest = (overrides?: Partial<ServiceRequestResult>): ServiceRequestResult => ({
  id: 'sr-uuid-1',
  contractorId: 'user-uuid-1',
  providerId: 'provider-uuid-1',
  serviceId: 'service-uuid-1',
  addressId: 'address-uuid-1',
  status: 'PENDING',
  contractorConfirmed: false,
  providerConfirmed: false,
  createdAt: '2026-06-11T10:00:00Z',
  ...overrides,
});

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService;
  let api: ReturnType<typeof makeApi>;
  let logger: ReturnType<typeof makeLogger>;

  beforeEach(async () => {
    api = makeApi();
    logger = makeLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestsService,
        { provide: LOGGER_PROVIDER, useValue: logger },
        { provide: API_CLIENT_SERVICE, useValue: api },
      ],
    }).compile();

    service = module.get(ServiceRequestsService);
  });

  describe('create', () => {
    it('should call POST /v1/service-requests with correct body', async () => {
      const request = makeServiceRequest();
      api.post.mockResolvedValue(request);

      const params = {
        providerId: 'provider-uuid-1',
        serviceId: 'service-uuid-1',
        addressId: 'address-uuid-1',
        description: 'Preciso de faxina completa',
      };

      const result = await service.create(params);

      expect(api.post).toHaveBeenCalledWith({
        path: '/v1/service-requests',
        body: params,
      });
      expect(result).toEqual(request);
    });

    it('should log error and rethrow on failure', async () => {
      const error = new Error('API error');
      api.post.mockRejectedValue(error);

      await expect(
        service.create({ providerId: 'p', serviceId: 's', addressId: 'a' }),
      ).rejects.toThrow('API error');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should call GET /v1/service-requests with X-User-Type: CUSTOMER', async () => {
      const list = [makeServiceRequest()];
      api.get.mockResolvedValue(list);

      const result = await service.list('CUSTOMER');

      expect(api.get).toHaveBeenCalledWith({
        path: '/v1/service-requests',
        headers: { 'X-User-Type': 'CUSTOMER' },
      });
      expect(result).toEqual(list);
    });

    it('should call GET /v1/service-requests with X-User-Type: PROVIDER', async () => {
      api.get.mockResolvedValue([]);

      await service.list('PROVIDER');

      expect(api.get).toHaveBeenCalledWith({
        path: '/v1/service-requests',
        headers: { 'X-User-Type': 'PROVIDER' },
      });
    });

    it('should log error and rethrow on failure', async () => {
      api.get.mockRejectedValue(new Error('network error'));

      await expect(service.list('CUSTOMER')).rejects.toThrow('network error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should call GET /v1/service-requests/:id', async () => {
      const request = makeServiceRequest({ id: 'sr-abc' });
      api.get.mockResolvedValue(request);

      const result = await service.findById('sr-abc');

      expect(api.get).toHaveBeenCalledWith({ path: '/v1/service-requests/sr-abc' });
      expect(result).toEqual(request);
    });

    it('should log error and rethrow on failure', async () => {
      api.get.mockRejectedValue(new Error('not found'));

      await expect(service.findById('sr-abc')).rejects.toThrow('not found');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('should call PUT /v1/service-requests/:id/accept', async () => {
      const accepted = makeServiceRequest({ status: 'ACCEPTED' });
      api.put.mockResolvedValue(accepted);

      const result = await service.accept('sr-abc');

      expect(api.put).toHaveBeenCalledWith({
        path: '/v1/service-requests/sr-abc/accept',
        body: {},
      });
      expect(result.status).toBe('ACCEPTED');
    });

    it('should log error and rethrow on failure', async () => {
      api.put.mockRejectedValue(new Error('forbidden'));

      await expect(service.accept('sr-abc')).rejects.toThrow('forbidden');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should call PUT /v1/service-requests/:id/reject', async () => {
      const rejected = makeServiceRequest({ status: 'REJECTED' });
      api.put.mockResolvedValue(rejected);

      const result = await service.reject('sr-abc');

      expect(api.put).toHaveBeenCalledWith({
        path: '/v1/service-requests/sr-abc/reject',
        body: {},
      });
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('complete', () => {
    it('should call PUT /v1/service-requests/:id/complete', async () => {
      const completed = makeServiceRequest({ status: 'COMPLETED' });
      api.put.mockResolvedValue(completed);

      const result = await service.complete('sr-abc');

      expect(api.put).toHaveBeenCalledWith({
        path: '/v1/service-requests/sr-abc/complete',
        body: {},
      });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('cancel', () => {
    it('should call PUT /v1/service-requests/:id/cancel', async () => {
      const cancelled = makeServiceRequest({ status: 'CANCELLED' });
      api.put.mockResolvedValue(cancelled);

      const result = await service.cancel('sr-abc');

      expect(api.put).toHaveBeenCalledWith({
        path: '/v1/service-requests/sr-abc/cancel',
        body: {},
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should log error and rethrow on failure', async () => {
      api.put.mockRejectedValue(new Error('bad request'));

      await expect(service.cancel('sr-abc')).rejects.toThrow('bad request');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
