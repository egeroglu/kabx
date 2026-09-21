import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/test-app.js';

describe('health uçları', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/v1/health/live bağımlılıklara bakmadan 200 döner', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('/v1/health/ready Postgres, Redis ve kuyrukları kontrol eder', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health/ready' });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.info.postgres?.status).toBe('up');
    expect(body.info.redis?.status).toBe('up');
    expect(body.info.queues?.status).toBe('up');
  });

  it('istek kimliği cevap başlığında döner', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health/live',
      headers: { 'x-request-id': 'mobil-den-gelen-id' },
    });
    expect(response.headers['x-request-id']).toBe('mobil-den-gelen-id');
  });

  it('istemci kimlik göndermezse sunucu üretir', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health/live' });
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('güvenlik başlıkları (helmet) uygulanır', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health/live' });
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
