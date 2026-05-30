import { Test, TestingModule } from '@nestjs/testing';

import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';

import { AuthService } from './auth.service';

const makeLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeApi = () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

describe('AuthService (Provider Profile E2E)', () => {
  let service: AuthService;
  let logger: ReturnType<typeof makeLogger>;
  let api: ReturnType<typeof makeApi>;

  beforeEach(async () => {
    logger = makeLogger();
    api = makeApi();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: LOGGER_PROVIDER, useValue: logger },
        { provide: API_CLIENT_SERVICE, useValue: api },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('Provider Profile: Categories → Services → Availability', () => {
    it('should complete full provider profile setup flow', async () => {
      const keycloakId = 'provider-123';
      const serviceId = 'svc-456';
      const dayOfWeek = 1;

      // Step 1: Get categories
      const categoriesResult = {
        success: true,
        data: [
          {
            id: 'cat-001',
            name: 'Limpeza',
            slug: 'limpeza',
            iconUrl: 'broom',
          },
          {
            id: 'cat-002',
            name: 'Reparos',
            slug: 'reparos',
            iconUrl: 'tools',
          },
        ],
      };

      api.get.mockResolvedValueOnce(categoriesResult);

      const categoriesResponse = await service.getCategories();

      expect(categoriesResponse).toEqual(categoriesResult);
      expect(api.get).toHaveBeenNthCalledWith(1, {
        path: '/v1/auth/categories',
      });

      // Step 2: Create provider service
      const createServiceResult = {
        success: true,
        data: {
          id: serviceId,
          serviceId: 'generic-svc-001',
          categoryId: 'cat-001',
          categoryName: 'Limpeza',
          serviceName: 'Limpeza Residencial',
          estimatedDurationMinutes: 120,
          pricePerHour: 50.0,
          priceBase: null,
          priceType: null,
          isActive: true,
        },
      };

      api.post.mockResolvedValueOnce(createServiceResult);

      const createServiceResponse = await service.createProviderService(
        {
          serviceId: 'generic-svc-001',
          estimatedDurationMinutes: 120,
          pricePerHour: 50.0,
        },
        keycloakId,
      );

      expect(createServiceResponse).toEqual(createServiceResult);
      expect(api.post).toHaveBeenNthCalledWith(1, {
        path: '/v1/auth/providers/me/services',
        body: {
          serviceId: 'generic-svc-001',
          estimatedDurationMinutes: 120,
          pricePerHour: 50.0,
        },
        headers: { 'X-User-Id': keycloakId },
      });

      // Step 3: Get provider services
      const getServicesResult = {
        success: true,
        data: [createServiceResult.data],
      };

      api.get.mockResolvedValueOnce(getServicesResult);

      const getServicesResponse = await service.getProviderServices(keycloakId);

      expect(getServicesResponse).toEqual(getServicesResult);
      expect(api.get).toHaveBeenNthCalledWith(2, {
        path: '/v1/auth/providers/me/services',
        headers: { 'X-User-Id': keycloakId },
      });

      // Step 4: Set availability
      const setAvailabilityResult = {
        success: true,
        data: {
          id: 'avail-001',
          dayOfWeek,
          startTime: '08:00',
          endTime: '18:00',
          isActive: true,
        },
      };

      api.post.mockResolvedValueOnce(setAvailabilityResult);

      const setAvailabilityResponse = await service.setProviderAvailability(
        {
          dayOfWeek,
          startTime: '08:00',
          endTime: '18:00',
        },
        keycloakId,
      );

      expect(setAvailabilityResponse).toEqual(setAvailabilityResult);
      expect(api.post).toHaveBeenNthCalledWith(2, {
        path: '/v1/auth/providers/me/availability',
        body: {
          dayOfWeek,
          startTime: '08:00',
          endTime: '18:00',
        },
        headers: { 'X-User-Id': keycloakId },
      });

      // Step 5: Get availability
      const getAvailabilityResult = {
        success: true,
        data: [setAvailabilityResult.data],
      };

      api.get.mockResolvedValueOnce(getAvailabilityResult);

      const getAvailabilityResponse = await service.getProviderAvailability(keycloakId);

      expect(getAvailabilityResponse).toEqual(getAvailabilityResult);
      expect(api.get).toHaveBeenNthCalledWith(3, {
        path: '/v1/auth/providers/me/availability',
        headers: { 'X-User-Id': keycloakId },
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith({
        message: 'Provider service created: svc-456',
        context: 'AuthService.createProviderService',
      });

      expect(logger.info).toHaveBeenCalledWith({
        message: `Provider availability set for day ${dayOfWeek}`,
        context: 'AuthService.setProviderAvailability',
      });
    });

    it('should handle update and delete service operations', async () => {
      const keycloakId = 'provider-123';
      const serviceId = 'svc-456';

      // Update service
      const updateResult = {
        success: true,
        data: {
          id: serviceId,
          serviceId: 'generic-svc-001',
          categoryId: 'cat-001',
          categoryName: 'Limpeza',
          serviceName: 'Limpeza Residencial Premium',
          estimatedDurationMinutes: 180,
          pricePerHour: 75.0,
          priceBase: null,
          priceType: null,
          isActive: true,
        },
      };

      api.put.mockResolvedValueOnce(updateResult);

      const updateResponse = await service.updateProviderService(
        serviceId,
        {
          estimatedDurationMinutes: 180,
          pricePerHour: 75.0,
        },
        keycloakId,
      );

      expect(updateResponse).toEqual(updateResult);
      expect(api.put).toHaveBeenCalledWith({
        path: `/v1/auth/providers/me/services/${serviceId}`,
        body: {
          estimatedDurationMinutes: 180,
          pricePerHour: 75.0,
        },
        headers: { 'X-User-Id': keycloakId },
      });

      // Delete service
      const deleteResult = { success: true };

      api.delete.mockResolvedValueOnce(deleteResult);

      const deleteResponse = await service.deleteProviderService(serviceId, keycloakId);

      expect(deleteResponse).toEqual(deleteResult);
      expect(api.delete).toHaveBeenCalledWith({
        path: `/v1/auth/providers/me/services/${serviceId}`,
        headers: { 'X-User-Id': keycloakId },
      });
    });

    it('should handle update availability operation', async () => {
      const keycloakId = 'provider-123';
      const dayOfWeek = 2;

      const updateResult = {
        success: true,
        data: {
          id: 'avail-002',
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      };

      api.put.mockResolvedValueOnce(updateResult);

      const updateResponse = await service.updateProviderAvailability(
        dayOfWeek,
        {
          startTime: '09:00',
          endTime: '17:00',
        },
        keycloakId,
      );

      expect(updateResponse).toEqual(updateResult);
      expect(api.put).toHaveBeenCalledWith({
        path: `/v1/auth/providers/me/availability/${dayOfWeek}`,
        body: {
          startTime: '09:00',
          endTime: '17:00',
        },
        headers: { 'X-User-Id': keycloakId },
      });

      expect(logger.info).toHaveBeenCalledWith({
        message: `Provider availability updated for day ${dayOfWeek}`,
        context: 'AuthService.updateProviderAvailability',
      });
    });

    it('should handle API errors gracefully', async () => {
      const keycloakId = 'provider-123';
      const apiError = new Error('API service unavailable');

      api.get.mockRejectedValueOnce(apiError);

      await expect(service.getCategories()).rejects.toThrow(apiError);

      expect(logger.error).toHaveBeenCalledWith({
        message: `Error getting categories: API service unavailable`,
        context: 'AuthService.getCategories',
      });
    });
  });
});
