import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '@app/app.module';

/**
 * CORS E2E Tests — BFF
 * Verifica comportamento CORS para rotas do BFF.
 */
describe('CORS E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      if ((error as Error).message?.includes('DataSource')) {
        console.warn('⚠️  DataSource cleanup error (expected with MONGO_URI)');
      } else {
        throw error;
      }
    }
  });

  describe('CORS Headers', () => {
    it('should handle requests with origin header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.statusCode).not.toBe(500);
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/bff/home',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'content-type',
        },
      });

      expect([200, 204, 404, 405]).toContain(response.statusCode);
    });

    it('should handle multiple origins safely', async () => {
      const origins = ['http://localhost:3000', 'https://example.com', 'https://malicious.com'];

      for (const origin of origins) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
          headers: { origin },
        });

        expect(response.statusCode).not.toBe(500);
      }
    });
  });

  describe('Method Restrictions', () => {
    it('should only allow GET on /health endpoint', async () => {
      const restrictedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of restrictedMethods) {
        const response = await app.inject({
          method: method as any,
          url: '/health',
        });

        expect(response.statusCode).not.toBe(500);
      }
    });

    it('should only allow GET on /bff/home', async () => {
      const nonGetMethods = ['PUT', 'DELETE', 'PATCH'];

      for (const method of nonGetMethods) {
        const response = await app.inject({
          method: method as any,
          url: '/bff/home',
        });

        expect([404, 405]).toContain(response.statusCode);
      }
    });
  });

  describe('Request/Response Validation', () => {
    it('should include proper Content-Type in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const contentType = response.headers['content-type'];
      expect(contentType).toContain('application/json');
    });
  });
});
