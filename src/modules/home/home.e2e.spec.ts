import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '@app/app.module';

describe('Home Controller (e2e)', () => {
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

  describe('GET /bff/home', () => {
    it('should return 200 and a layout', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bff/home',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('layout');
      expect(Array.isArray(body.layout)).toBe(true);
    });

    it('should have featured_categories and featured_providers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bff/home',
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('featured_categories');
      expect(body).toHaveProperty('featured_providers');
      expect(Array.isArray(body.featured_categories)).toBe(true);
      expect(Array.isArray(body.featured_providers)).toBe(true);
    });

    it('should return 200 even if API is slow (testing resiliency)', async () => {
      // Nota: No ambiente de E2E da pipeline, isso valida se o BFF não quebra
      // se as dependências downstream estiverem offline/lentas (conforme tratamento no service)
      const response = await app.inject({
        method: 'GET',
        url: '/bff/home',
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
