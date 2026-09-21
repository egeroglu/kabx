import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ErrorCode } from '../../src/common/errors/error-codes.js';
import { createTestApp } from '../helpers/test-app.js';
import { signIn, type SignInResult } from '../helpers/auth.js';

describe('kimlik doğrulama akışı', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Apple / Google girişi', () => {
    it('ilk girişte kullanıcı oluşturur ve oturum verir', async () => {
      const result = await signIn(app, {
        provider: 'apple',
        subject: 'apple-brand-new-user',
        email: 'new@example.com',
      });

      expect(result.isNewUser).toBe(true);
      expect(result.onboardingCompleted).toBe(false);
      expect(result.session.accessToken.split('.')).toHaveLength(3);
      expect(result.session.refreshToken.length).toBeGreaterThan(20);
      expect(result.session.expiresIn).toBe(900);
    });

    it('aynı sağlayıcı kimliğiyle ikinci giriş yeni kullanıcı açmaz', async () => {
      const first = await signIn(app, {
        provider: 'apple',
        subject: 'apple-repeat',
        email: 'repeat@example.com',
      });
      const second = await signIn(app, {
        provider: 'apple',
        subject: 'apple-repeat',
        email: 'repeat@example.com',
      });

      expect(second.isNewUser).toBe(false);
      expect(second.userId).toBe(first.userId);
    });

    it('aynı DOĞRULANMIŞ e-posta farklı sağlayıcıdan gelirse tek hesaba bağlanır', async () => {
      const apple = await signIn(app, {
        provider: 'apple',
        subject: 'a-link',
        email: 'link@example.com',
      });
      const google = await signIn(app, {
        provider: 'google',
        subject: 'g-link',
        email: 'link@example.com',
      });

      expect(google.userId).toBe(apple.userId);
      expect(google.isNewUser).toBe(false);
    });

    it('e-posta paylaşmayan iki kimlik AYRI hesaplar olur', async () => {
      const first = await signIn(app, { provider: 'apple', subject: 'apple-without-email-1' });
      const second = await signIn(app, { provider: 'apple', subject: 'apple-without-email-2' });

      expect(second.userId).not.toBe(first.userId);
    });

    it('geçersiz kimlik belirteci reddedilir', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/apple',
        payload: { idToken: 'gercek-olmayan-bir-jwt-dizesi' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: { code: ErrorCode.IDENTITY_PROVIDER_REJECTED },
      });
    });

    it('eksik gövde doğrulama hatası verir', async () => {
      const response = await app.inject({ method: 'POST', url: '/v1/auth/apple', payload: {} });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.VALIDATION_FAILED } });
    });
  });

  describe('refresh token rotasyonu', () => {
    it('her yenilemede YENİ refresh token döner', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'rotation-basic-case' });
      const refreshed = await refresh(app, session.session.refreshToken);

      expect(refreshed.refreshToken).not.toBe(session.session.refreshToken);
      expect(refreshed.accessToken).toBeTruthy();
    });

    it('kullanılmış token tekrar gelirse REFRESH_TOKEN_REUSED', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'rotation-reuse-case' });
      const old = session.session.refreshToken;
      await refresh(app, old);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: old },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.REFRESH_TOKEN_REUSED } });
    });

    it('yeniden kullanım tespitinde ZİNCİRİN TAMAMI iptal edilir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'rotation-chain-case' });
      const old = session.session.refreshToken;
      const current = await refresh(app, old);

      // Saldırgan çalınmış eski token'ı kullandı:
      await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: old } });

      // Gerçek kullanıcının GEÇERLİ token'ı da artık çalışmamalı.
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: current.refreshToken },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.REFRESH_TOKEN_REUSED } });
    });

    it('bilinmeyen token REFRESH_TOKEN_INVALID döner (REUSED değil)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: 'boyle-bir-token-asla-verilmedi-123456' },
      });

      expect(response.json()).toMatchObject({ error: { code: ErrorCode.REFRESH_TOKEN_INVALID } });
    });

    it('çıkış yalnızca o cihazın zincirini düşürür', async () => {
      const phone = await signIn(app, {
        provider: 'apple',
        subject: 'multi-device',
        email: 'multi@example.com',
      });
      const tablet = await signIn(app, {
        provider: 'apple',
        subject: 'multi-device',
        email: 'multi@example.com',
      });

      await app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        payload: { refreshToken: phone.session.refreshToken },
      });

      const phoneRetry = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: phone.session.refreshToken },
      });
      expect(phoneRetry.statusCode).toBe(401);

      // Diğer cihaz etkilenmemeli.
      const tabletRetry = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: tablet.session.refreshToken },
      });
      expect(tabletRetry.statusCode).toBe(200);
    });

    it('bilinmeyen token ile çıkış da başarılı sayılır (varlık bilgisi sızmasın)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        payload: { refreshToken: 'hicbir-zaman-var-olmamis-token-1234' },
      });
      expect(response.statusCode).toBe(204);
    });
  });

  describe('korumalı uçlar', () => {
    it('token olmadan 401', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/me' });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.UNAUTHORIZED } });
    });

    it('bozuk token 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: { authorization: 'Bearer duzmece.jwt.imza' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('Bearer olmayan şema reddedilir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'auth-scheme-check-1' });
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: { authorization: `Basic ${session.session.accessToken}` },
      });
      expect(response.statusCode).toBe(401);
    });

    it('geçerli token profili getirir', async () => {
      const session = await signIn(app, {
        provider: 'apple',
        subject: 'protected-endpoint-1',
        email: 'ok@example.com',
        displayName: 'Ayşe',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: { authorization: `Bearer ${session.session.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: session.userId,
        email: 'ok@example.com',
        displayName: 'Ayşe',
        locale: 'tr',
      });
    });

    it('health uçları token istemez (probe token taşıyamaz)', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/health/live' });
      expect(response.statusCode).toBe(200);
    });
  });
});

async function refresh(
  app: NestFastifyApplication,
  refreshToken: string,
): Promise<SignInResult['session']> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/refresh',
    payload: { refreshToken },
  });
  if (response.statusCode !== 200) {
    throw new Error(`refresh başarısız: ${response.statusCode} ${response.body}`);
  }
  return response.json();
}
