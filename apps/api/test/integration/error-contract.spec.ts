import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ErrorCode } from '../../src/common/errors/error-codes.js';
import { createTestApp } from '../helpers/test-app.js';

/**
 * Hata sözleşmesi mobil tarafın i18n'ine doğrudan bağlı: `error.code` kaybolursa
 * uygulama kullanıcıya boş mesaj gösterir. Bu yüzden gerçek HTTP katmanından
 * (filter + Fastify dahil) doğrulanıyor.
 */
describe('hata sözleşmesi', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bilinmeyen yol NOT_FOUND kodlu tek formatta döner', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/boyle-bir-sey-yok' });
    expect(response.statusCode).toBe(404);

    const body = response.json();
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(typeof body.error.message).toBe('string');
  });

  it("prefix'siz istek de aynı formatta hata döner (tüm API /v1 altında)", async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('desteklenmeyen metot da sözleşmeye uyar', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/health/live' });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json()).toHaveProperty('error.code');
  });
});
