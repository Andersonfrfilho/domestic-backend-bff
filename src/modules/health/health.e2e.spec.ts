import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '@app/app.module';

describe('Health Controller (e2e)', () => {
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

  it('GET /health should return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
  });

  it('GET /health should return JSON content type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('GET /health should have status property', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status');
    expect(body.status).toBe(true);
  });

  it('PUT /health should return 404', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/health',
    });
    expect(response.statusCode).toBe(404);
  });

  it('POST /health should return 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/health',
    });
    expect(response.statusCode).toBe(404);
  });

  it('DELETE /health should return 404', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/health',
    });
    expect(response.statusCode).toBe(404);
  });
});
