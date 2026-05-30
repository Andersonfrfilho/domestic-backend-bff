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
});

describe('AuthService (E2E Flow)', () => {
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

  describe('Account Recovery Flow: Self-unlock Initiate → Verify', () => {
    it('should complete full self-unlock flow: initiate → verify → resolve', async () => {
      const blockId = 'block-789';
      const keycloakId = 'user-123';
      const validCode = '1234';

      // Step 1: Initiate self-unlock
      const initiateResult = {
        success: true as const,
        message: 'Código enviado para seu e-mail',
        destination: 'u***@email.com',
        expiresIn: 300,
      };

      api.post.mockResolvedValueOnce(initiateResult);

      const initiateResponse = await service.initiateSelfUnlock({
        blockId,
        keycloakId,
      });

      expect(initiateResponse).toEqual(initiateResult);
      expect(api.post).toHaveBeenNthCalledWith(1, {
        path: `/v1/users/me/account-block/${blockId}/self-unlock`,
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });

      // Step 2: Verify code (success)
      const verifyResult = {
        success: true,
        blockResolved: true,
        message: 'Conta desbloqueada com sucesso',
      };

      api.post.mockResolvedValueOnce(verifyResult);

      const verifyResponse = await service.verifySelfUnlock({
        blockId,
        code: validCode,
        keycloakId,
      });

      expect(verifyResponse).toEqual(verifyResult);
      expect(api.post).toHaveBeenNthCalledWith(2, {
        path: `/v1/users/me/account-block/${blockId}/self-unlock/verify`,
        body: { code: validCode },
        headers: { 'X-User-Id': keycloakId },
      });

      // Verify logging
      expect(logger.info).toHaveBeenNthCalledWith(1, {
        message: `Self-unlock initiated for block: ${blockId}`,
        context: 'AuthService.initiateSelfUnlock',
      });

      expect(logger.info).toHaveBeenNthCalledWith(2, {
        message: `Self-unlock verification result for block ${blockId}: success=true, blockResolved=true`,
        context: 'AuthService.verifySelfUnlock',
      });
    });

    it('should handle invalid code attempt with retry available', async () => {
      const blockId = 'block-789';
      const keycloakId = 'user-123';
      const invalidCode = '0000';

      // Step 1: Initiate (already done, skip)
      api.post.mockResolvedValueOnce({
        success: true as const,
        message: 'Código enviado',
        destination: 'u***@email.com',
        expiresIn: 300,
      });

      await service.initiateSelfUnlock({ blockId, keycloakId });

      // Step 2: Verify with invalid code
      const verifyResult = {
        success: false,
        blockResolved: false,
        message: 'Código inválido. Tentativas restantes: 2',
        canRetryAt: new Date(Date.now() + 60000).toISOString(),
      };

      api.post.mockResolvedValueOnce(verifyResult);

      const verifyResponse = await service.verifySelfUnlock({
        blockId,
        code: invalidCode,
        keycloakId,
      });

      expect(verifyResponse.success).toBe(false);
      expect(verifyResponse.blockResolved).toBe(false);
      expect(verifyResponse.canRetryAt).toBeDefined();

      // Step 3: Retry with correct code
      const retryResult = {
        success: true,
        blockResolved: true,
        message: 'Conta desbloqueada',
      };

      api.post.mockResolvedValueOnce(retryResult);

      const retryResponse = await service.verifySelfUnlock({
        blockId,
        code: '1234',
        keycloakId,
      });

      expect(retryResponse.success).toBe(true);
      expect(retryResponse.blockResolved).toBe(true);
    });

    it('should handle expired code scenario', async () => {
      const blockId = 'block-789';
      const keycloakId = 'user-123';
      const expiredCode = '1234';

      api.post.mockResolvedValueOnce({
        success: true as const,
        message: 'Código enviado',
        destination: 'u***@email.com',
        expiresIn: 300,
      });

      await service.initiateSelfUnlock({ blockId, keycloakId });

      // Simulate expired code
      const verifyResult = {
        success: false,
        blockResolved: false,
        message: 'Código expirado. Solicite um novo.',
      };

      api.post.mockResolvedValueOnce(verifyResult);

      const verifyResponse = await service.verifySelfUnlock({
        blockId,
        code: expiredCode,
        keycloakId,
      });

      expect(verifyResponse.success).toBe(false);
      expect(verifyResponse.blockResolved).toBe(false);
      expect(verifyResponse.message).toContain('expirado');
    });

    it('should handle API errors gracefully during initiate', async () => {
      const blockId = 'block-error';
      const keycloakId = 'user-123';
      const apiError = new Error('API service unavailable');

      api.post.mockRejectedValueOnce(apiError);

      await expect(
        service.initiateSelfUnlock({ blockId, keycloakId }),
      ).rejects.toThrow(apiError);

      expect(logger.warn).toHaveBeenCalledWith({
        message: `Failed to initiate self-unlock for block ${blockId}: API service unavailable`,
        context: 'AuthService.initiateSelfUnlock',
      });
    });

    it('should handle API errors gracefully during verify', async () => {
      const blockId = 'block-error';
      const keycloakId = 'user-123';
      const code = '1234';
      const apiError = new Error('Network timeout');

      api.post.mockRejectedValueOnce(apiError);

      await expect(
        service.verifySelfUnlock({ blockId, code, keycloakId }),
      ).rejects.toThrow(apiError);

      expect(logger.warn).toHaveBeenCalledWith({
        message: `Failed to verify self-unlock code for block ${blockId}: Network timeout`,
        context: 'AuthService.verifySelfUnlock',
      });
    });
  });
});
