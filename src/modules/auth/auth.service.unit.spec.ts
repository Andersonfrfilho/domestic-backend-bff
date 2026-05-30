import { Test, TestingModule } from '@nestjs/testing';

import { LOGGER_PROVIDER } from '@adatechnology/nestjs-logger';
import { API_CLIENT_SERVICE } from '@modules/shared/api-client/api-client.token';

import { AuthService } from './auth.service';
import type {
  SelfUnlockInitiateResult,
  SelfUnlockVerifyResult,
} from './dtos/auth.types';

const makeLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeApi = () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
});

describe('AuthService', () => {
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

  describe('initiateSelfUnlock', () => {
    it('should initiate self-unlock and return result', async () => {
      const blockId = 'block-123';
      const keycloakId = 'user-456';
      const mockResult: SelfUnlockInitiateResult = {
        success: true,
        message: 'Código enviado para seu e-mail',
        destination: 'a***@gmail.com',
        expiresIn: 300,
      };

      api.post.mockResolvedValue(mockResult);

      const result = await service.initiateSelfUnlock({
        blockId,
        keycloakId,
      });

      expect(result).toEqual(mockResult);
      expect(api.post).toHaveBeenCalledWith({
        path: `/v1/users/me/account-block/${blockId}/self-unlock`,
        body: {},
        headers: { 'X-User-Id': keycloakId },
      });
      expect(logger.info).toHaveBeenCalledWith({
        message: `Self-unlock initiated for block: ${blockId}`,
        context: 'AuthService.initiateSelfUnlock',
      });
    });

    it('should log and rethrow on API error', async () => {
      const blockId = 'block-123';
      const keycloakId = 'user-456';
      const error = new Error('API error');

      api.post.mockRejectedValue(error);

      await expect(
        service.initiateSelfUnlock({
          blockId,
          keycloakId,
        }),
      ).rejects.toThrow(error);

      expect(logger.warn).toHaveBeenCalledWith({
        message: `Failed to initiate self-unlock for block ${blockId}: API error`,
        context: 'AuthService.initiateSelfUnlock',
      });
    });
  });

  describe('verifySelfUnlock', () => {
    it('should verify self-unlock code and return result with success', async () => {
      const blockId = 'block-123';
      const keycloakId = 'user-456';
      const code = '1234';
      const mockResult: SelfUnlockVerifyResult = {
        success: true,
        blockResolved: true,
        message: 'Conta desbloqueada com sucesso',
      };

      api.post.mockResolvedValue(mockResult);

      const result = await service.verifySelfUnlock({
        blockId,
        code,
        keycloakId,
      });

      expect(result).toEqual(mockResult);
      expect(api.post).toHaveBeenCalledWith({
        path: `/v1/users/me/account-block/${blockId}/self-unlock/verify`,
        body: { code },
        headers: { 'X-User-Id': keycloakId },
      });
      expect(logger.info).toHaveBeenCalledWith({
        message: `Self-unlock verification result for block ${blockId}: success=true, blockResolved=true`,
        context: 'AuthService.verifySelfUnlock',
      });
    });

    it('should verify self-unlock code and return result with failure', async () => {
      const blockId = 'block-123';
      const keycloakId = 'user-456';
      const code = '9999';
      const mockResult: SelfUnlockVerifyResult = {
        success: false,
        blockResolved: false,
        message: 'Código inválido. Tente novamente.',
        canRetryAt: '2026-05-28T14:30:00Z',
      };

      api.post.mockResolvedValue(mockResult);

      const result = await service.verifySelfUnlock({
        blockId,
        code,
        keycloakId,
      });

      expect(result).toEqual(mockResult);
      expect(logger.info).toHaveBeenCalledWith({
        message: `Self-unlock verification result for block ${blockId}: success=false, blockResolved=false`,
        context: 'AuthService.verifySelfUnlock',
      });
    });

    it('should log and rethrow on API error', async () => {
      const blockId = 'block-123';
      const keycloakId = 'user-456';
      const code = '1234';
      const error = new Error('API error');

      api.post.mockRejectedValue(error);

      await expect(
        service.verifySelfUnlock({
          blockId,
          code,
          keycloakId,
        }),
      ).rejects.toThrow(error);

      expect(logger.warn).toHaveBeenCalledWith({
        message: `Failed to verify self-unlock code for block ${blockId}: API error`,
        context: 'AuthService.verifySelfUnlock',
      });
    });
  });
});
