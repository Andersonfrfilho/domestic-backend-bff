import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { setupApp } from '../../setup-app'; // Suposição de utilitário comum

describe('Dashboard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /bff/dashboard/contractor', () => {
    it('should return 401 if x-user-id is missing', () => {
      return request(app.getHttpServer()).get('/bff/dashboard/contractor').expect(401); // Filtro global ou guard de auth deve barrar sem header se ativado
    });

    it('should return contractor dashboard with valid headers', () => {
      return request(app.getHttpServer())
        .get('/bff/dashboard/contractor')
        .set('x-user-id', 'test-user-uuid')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('active_requests');
          expect(res.body).toHaveProperty('pending_requests');
          expect(res.body).toHaveProperty('unread_notifications');
        });
    });
  });

  describe('GET /bff/dashboard/provider', () => {
    it('should return provider dashboard with valid headers', () => {
      return request(app.getHttpServer())
        .get('/bff/dashboard/provider')
        .set('x-user-id', 'test-provider-uuid')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('incoming_requests');
          expect(res.body).toHaveProperty('active_requests');
          expect(res.body).toHaveProperty('average_rating');
        });
    });
  });
});
