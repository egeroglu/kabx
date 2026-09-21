import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';

import { ErrorCode } from '../../src/common/errors/error-codes.js';
import { createDbHandleFromUrl, type DbHandle } from '../../src/db/client.js';
import { emailOtps } from '../../src/db/schema/auth.js';
import { createTestApp } from '../helpers/test-app.js';

/**
 * OTP kodu e-postayla gidiyor; testte mock sağlayıcı kullanılıyor ve gönderilen
 * kodu okumak mümkün değil. Bu yüzden kodu doğrudan veritabanından DEĞİL —
 * saklanan yalnızca HMAC — bilinen bir koda ait özeti yazarak test ediyoruz.
 */
describe('e-posta ile giriş (OTP)', () => {
  let app: NestFastifyApplication;
  let handle: DbHandle;

  beforeAll(async () => {
    app = await createTestApp();
    handle = createDbHandleFromUrl(inject('databaseUrl'), { max: 2 });
  });

  afterAll(async () => {
    await handle.close();
    await app.close();
  });

  const request = (email: string) =>
    app.inject({ method: 'POST', url: '/v1/auth/email/request', payload: { email } });

  const verify = (email: string, code: string) =>
    app.inject({ method: 'POST', url: '/v1/auth/email/verify', payload: { email, code } });

  /** Test için bilinen bir kodu, servisin kullandığı HMAC'le kaydeder. */
  async function seedOtp(email: string, code: string): Promise<void> {
    const { TokenHasher } = await import('../../src/modules/auth/token.hash.js');
    const hasher = new TokenHasher(
      process.env.AUTH_HASH_SECRET ?? 'dev-only-auth-hash-secret-change-me-32ch',
    );
    await handle.db.insert(emailOtps).values({
      email,
      codeHash: hasher.hash(code),
      expiresAt: new Date(Date.now() + 600_000),
    });
  }

  it('kod isteği her zaman aynı cevabı döner (hesap sayımı önlenir)', async () => {
    const response = await request('kayitli-olmayan@example.com');
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it('kod veritabanına DÜZ METİN olarak yazılmaz', async () => {
    await request('hash-kontrol@example.com');

    const rows = await handle.db
      .select()
      .from(emailOtps)
      .where(eq(emailOtps.email, 'hash-kontrol@example.com'));

    expect(rows).toHaveLength(1);
    // HMAC-SHA256 → 64 hex karakter, 6 haneli kodun kendisi değil.
    expect(rows[0]?.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('bekleme süresi dolmadan ikinci kod istenemez', async () => {
    await request('cooldown@example.com');
    const second = await request('cooldown@example.com');

    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({ error: { code: ErrorCode.RATE_LIMITED } });
  });

  it('doğru kod oturum açar ve kullanıcı oluşturur', async () => {
    await seedOtp('otp-basarili@example.com', '123456');

    const response = await verify('otp-basarili@example.com', '123456');

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.isNewUser).toBe(true);
    expect(body.session.accessToken).toBeTruthy();
  });

  it('e-posta büyük/küçük harf farkı önemli değil', async () => {
    await seedOtp('buyuk-harf@example.com', '222222');

    const response = await verify('BUYUK-HARF@Example.COM', '222222');
    expect(response.statusCode).toBe(200);
  });

  it('aynı kod ikinci kez kullanılamaz', async () => {
    await seedOtp('tek-kullanim@example.com', '333333');
    await verify('tek-kullanim@example.com', '333333');

    const second = await verify('tek-kullanim@example.com', '333333');
    expect(second.statusCode).toBe(401);
    expect(second.json()).toMatchObject({ error: { code: ErrorCode.OTP_EXPIRED } });
  });

  it('yanlış kod OTP_INVALID döner', async () => {
    await seedOtp('yanlis-kod@example.com', '444444');

    const response = await verify('yanlis-kod@example.com', '000000');
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: ErrorCode.OTP_INVALID } });
  });

  it('deneme sınırı aşılınca kod tüketilir — kaba kuvvet sürdürülemez', async () => {
    await seedOtp('kaba-kuvvet@example.com', '555555');

    // OTP_MAX_ATTEMPTS = 5
    for (let i = 0; i < 4; i += 1) {
      const response = await verify('kaba-kuvvet@example.com', '999999');
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.OTP_INVALID } });
    }

    const fifth = await verify('kaba-kuvvet@example.com', '999999');
    expect(fifth.statusCode).toBe(429);
    expect(fifth.json()).toMatchObject({ error: { code: ErrorCode.OTP_TOO_MANY_ATTEMPTS } });

    // Artık DOĞRU kod bile çalışmamalı: kayıt tüketildi.
    const correct = await verify('kaba-kuvvet@example.com', '555555');
    expect(correct.json()).toMatchObject({ error: { code: ErrorCode.OTP_EXPIRED } });
  });

  it('süresi dolmuş kod kabul edilmez', async () => {
    const { TokenHasher } = await import('../../src/modules/auth/token.hash.js');
    const hasher = new TokenHasher(
      process.env.AUTH_HASH_SECRET ?? 'dev-only-auth-hash-secret-change-me-32ch',
    );
    await handle.db.insert(emailOtps).values({
      email: 'suresi-dolmus@example.com',
      codeHash: hasher.hash('666666'),
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await verify('suresi-dolmus@example.com', '666666');
    expect(response.json()).toMatchObject({ error: { code: ErrorCode.OTP_EXPIRED } });
  });

  it('6 hane olmayan kod doğrulamaya bile girmez', async () => {
    const response = await verify('a@example.com', 'abc');
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: ErrorCode.VALIDATION_FAILED } });
  });
});
