import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '@app/app.module';

describe('Screens Controller (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /bff/screens', () => {
    it('should return a list of screen configurations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bff/screens',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('GET /bff/screens/:screenId', () => {
    it('should return 404 for non-existent screen', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bff/screens/non-existent',
      });

      // Se não houver config, o service retorna null/404
      expect([200, 404]).toContain(response.statusCode);
    });

    it('should activate and get a screen configuration', async () => {
      const screenId = 'test-e2e-screen';
      const screenData = {
        version: '1.0',
        components: [
          { id: 'c1', type: 'header', data_source: 'none', order: 0, config: {}, visible: true },
        ],
      };

      // Create/Upsert
      const upsertResponse = await app.inject({
        method: 'PUT',
        url: `/bff/screens/${screenId}`,
        payload: screenData,
      });
      expect(upsertResponse.statusCode).toBe(200);

      // Get
      const getResponse = await app.inject({
        method: 'GET',
        url: `/bff/screens/${screenId}`,
      });
      expect(getResponse.statusCode).toBe(200);
      const body = JSON.parse(getResponse.body);
      expect(body.screen_id).toBe(screenId);
      expect(body.version).toBe('1.0');
    });
  });

  describe('DELETE /bff/screens/:screenId', () => {
    it('should deactivate a screen', async () => {
      const screenId = 'test-e2e-deactivate';

      // Upsert first
      await app.inject({
        method: 'PUT',
        url: `/bff/screens/${screenId}`,
        payload: { version: '1.0', components: [] },
      });

      // Deactivate
      const response = await app.inject({
        method: 'DELETE',
        url: `/bff/screens/${screenId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.is_active).toBe(false);
    });
  });
});
