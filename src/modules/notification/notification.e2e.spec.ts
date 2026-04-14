import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Notifications (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /bff/notifications', () => {
    it('should return 200 with valid user headers', () => {
      return request(app.getHttpServer())
        .get('/bff/notifications')
        .set('x-user-id', 'test-user')
        .expect(200);
    });

    it('should return unread count', () => {
      return request(app.getHttpServer())
        .get('/bff/notifications/unread-count')
        .set('x-user-id', 'test-user')
        .expect(200);
    });
  });
});
