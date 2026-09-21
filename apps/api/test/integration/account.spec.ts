import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';

import { ErrorCode } from '../../src/common/errors/error-codes.js';
import { createDbHandleFromUrl, type DbHandle } from '../../src/db/client.js';
import { refreshTokens } from '../../src/db/schema/auth.js';
import { users } from '../../src/db/schema/users.js';
import { authHeader, signIn } from '../helpers/auth.js';
import { createTestApp } from '../helpers/test-app.js';

describe('profil ve hesap yönetimi', () => {
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

  describe('profil', () => {
    it('yeni kullanıcı varsayılanlarla gelir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'profil-varsayilan-1' });
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: authHeader(session),
      });

      expect(response.json()).toMatchObject({
        locale: 'tr',
        timezone: 'Europe/Istanbul',
        stylePreference: 'women',
        onboardingCompleted: false,
        role: 'user',
        notificationPreferences: { dailyOutfit: true, dailyOutfitHour: 8 },
      });
    });

    it('yalnızca gönderilen alanlar değişir', async () => {
      const session = await signIn(app, {
        provider: 'apple',
        subject: 'profil-kismi-guncelle',
        displayName: 'Eski Ad',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: authHeader(session),
        payload: { locale: 'en' },
      });

      expect(response.json()).toMatchObject({ locale: 'en', displayName: 'Eski Ad' });
    });

    it('bildirim tercihleri kısmi güncellenir, diğerleri korunur', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'bildirim-tercihleri-1' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: authHeader(session),
        payload: { notificationPreferences: { dailyOutfitHour: 7 } },
      });

      expect(response.json()).toMatchObject({
        notificationPreferences: {
          dailyOutfitHour: 7,
          dailyOutfit: true,
          wishlistReview: true,
          cleanupReminder: true,
        },
      });
    });

    it('konum çifti eksik gönderilemez', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'konum-dogrulama-1' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: authHeader(session),
        payload: { latitude: 41.0 },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.VALIDATION_FAILED } });
    });

    it('onboarding tamamlandı olarak işaretlenir ve geri alınamaz', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'onboarding-tamamla-1' });

      const first = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: authHeader(session),
        payload: { onboardingCompleted: true },
      });
      expect(first.json()).toMatchObject({ onboardingCompleted: true });

      // Şema yalnızca `true` kabul ediyor; false göndermek doğrulamada düşer.
      const revert = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: authHeader(session),
        payload: { onboardingCompleted: false },
      });
      expect(revert.statusCode).toBe(400);
    });

    it('boş gövde reddedilir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'bos-govde-testi-1' });
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: authHeader(session),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('rıza kayıtları (KVKK)', () => {
    it('yeni kullanıcıda bekleyen rızalar listelenir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'riza-bekleyen-1' });
      const response = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: authHeader(session),
      });

      expect(response.json().pendingConsents).toEqual(['privacy_notice', 'terms']);
    });

    it('rıza kaydedilince bekleyenlerden düşer', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'riza-kaydet-akisi' });

      for (const kind of ['privacy_notice', 'terms']) {
        await app.inject({
          method: 'POST',
          url: '/v1/me/consents',
          headers: authHeader(session),
          payload: { kind, version: '2026-09-01', locale: 'tr' },
        });
      }

      const me = await app.inject({ method: 'GET', url: '/v1/me', headers: authHeader(session) });
      expect(me.json().pendingConsents).toEqual([]);
    });

    it('aynı sürüm tekrar gönderilse de ilk onay zamanı korunur', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'riza-tekrar-gonder' });
      const payload = { kind: 'terms', version: '2026-09-01', locale: 'tr' };

      const first = await app.inject({
        method: 'POST',
        url: '/v1/me/consents',
        headers: authHeader(session),
        payload,
      });
      const firstAccepted = first.json()[0]?.acceptedAt;

      const second = await app.inject({
        method: 'POST',
        url: '/v1/me/consents',
        headers: authHeader(session),
        payload,
      });
      const rows = second.json<{ kind: string; acceptedAt: string }[]>();

      expect(rows.filter((row) => row.kind === 'terms')).toHaveLength(1);
      expect(rows[0]?.acceptedAt).toBe(firstAccepted);
    });
  });

  describe('cihaz kaydı', () => {
    it('cihaz kaydedilir ve listelenir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'cihaz-kayit-akisi' });

      const created = await app.inject({
        method: 'POST',
        url: '/v1/me/devices',
        headers: authHeader(session),
        payload: { pushToken: 'ExponentPushToken[aaaaaaaa]', platform: 'ios', appVersion: '1.0.0' },
      });
      expect(created.statusCode).toBe(201);

      const list = await app.inject({
        method: 'GET',
        url: '/v1/me/devices',
        headers: authHeader(session),
      });
      expect(list.json()).toHaveLength(1);
    });

    it('aynı token tekrar gönderilirse yeni kayıt açılmaz', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'cihaz-tekrar-kayit' });
      const payload = { pushToken: 'ExponentPushToken[bbbbbbbb]', platform: 'ios' as const };

      await app.inject({
        method: 'POST',
        url: '/v1/me/devices',
        headers: authHeader(session),
        payload,
      });
      await app.inject({
        method: 'POST',
        url: '/v1/me/devices',
        headers: authHeader(session),
        payload,
      });

      const list = await app.inject({
        method: 'GET',
        url: '/v1/me/devices',
        headers: authHeader(session),
      });
      expect(list.json()).toHaveLength(1);
    });

    it('aynı telefon başka hesaba giriş yaparsa token TAŞINIR', async () => {
      // Taşınmazsa önceki kullanıcının bildirimleri yeni kullanıcının
      // telefonuna düşerdi.
      const first = await signIn(app, { provider: 'apple', subject: 'cihaz-devir-eden-1' });
      const second = await signIn(app, { provider: 'apple', subject: 'cihaz-devir-alan-1' });
      const payload = { pushToken: 'ExponentPushToken[cccccccc]', platform: 'ios' as const };

      await app.inject({
        method: 'POST',
        url: '/v1/me/devices',
        headers: authHeader(first),
        payload,
      });
      await app.inject({
        method: 'POST',
        url: '/v1/me/devices',
        headers: authHeader(second),
        payload,
      });

      const firstList = await app.inject({
        method: 'GET',
        url: '/v1/me/devices',
        headers: authHeader(first),
      });
      const secondList = await app.inject({
        method: 'GET',
        url: '/v1/me/devices',
        headers: authHeader(second),
      });

      expect(firstList.json()).toHaveLength(0);
      expect(secondList.json()).toHaveLength(1);
    });

    it('başkasının cihazı silinemez ve varlığı sızmaz (404)', async () => {
      const owner = await signIn(app, { provider: 'apple', subject: 'cihaz-sahibi-kisi-1' });
      const stranger = await signIn(app, { provider: 'apple', subject: 'cihaz-yabanci-kisi-1' });

      const created = await app.inject({
        method: 'POST',
        url: '/v1/me/devices',
        headers: authHeader(owner),
        payload: { pushToken: 'ExponentPushToken[dddddddd]', platform: 'android' as const },
      });
      const deviceId = created.json().id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/me/devices/${deviceId}`,
        headers: authHeader(stranger),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: ErrorCode.NOT_FOUND } });

      // Sahibinde hâlâ duruyor.
      const list = await app.inject({
        method: 'GET',
        url: '/v1/me/devices',
        headers: authHeader(owner),
      });
      expect(list.json()).toHaveLength(1);
    });
  });

  describe('veri dışa aktarma (KVKK)', () => {
    it('iş oluşturur ve durumu sorgulanabilir', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'disa-aktarma-akisi' });

      const created = await app.inject({
        method: 'POST',
        url: '/v1/me/export',
        headers: authHeader(session),
      });
      expect(created.statusCode).toBe(202);

      const jobId = created.json().id;
      const status = await app.inject({
        method: 'GET',
        url: `/v1/me/export/${jobId}`,
        headers: authHeader(session),
      });
      expect(status.statusCode).toBe(200);
      expect(['pending', 'processing', 'ready']).toContain(status.json().status);
    });

    it('sürmekte olan iş varken yenisi açılmaz', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'disa-aktarma-tekrar' });

      const first = await app.inject({
        method: 'POST',
        url: '/v1/me/export',
        headers: authHeader(session),
      });
      const second = await app.inject({
        method: 'POST',
        url: '/v1/me/export',
        headers: authHeader(session),
      });

      expect(second.json().id).toBe(first.json().id);
    });

    it('başkasının işi görülemez', async () => {
      const owner = await signIn(app, { provider: 'apple', subject: 'export-sahibi-kisi' });
      const stranger = await signIn(app, { provider: 'apple', subject: 'export-yabanci-kisi' });

      const created = await app.inject({
        method: 'POST',
        url: '/v1/me/export',
        headers: authHeader(owner),
      });
      const jobId = created.json().id;

      const response = await app.inject({
        method: 'GET',
        url: `/v1/me/export/${jobId}`,
        headers: authHeader(stranger),
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('hesap silme', () => {
    it('hemen 202 döner, hesap pending_deletion olur ve oturumlar düşer', async () => {
      const session = await signIn(app, {
        provider: 'apple',
        subject: 'hesap-silme-akisi-1',
        email: 'silinecek@example.com',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/me',
        headers: authHeader(session),
      });
      expect(response.statusCode).toBe(202);

      const [row] = await handle.db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, session.userId));
      expect(row?.status).toBe('pending_deletion');

      const tokens = await handle.db
        .select({ revokedAt: refreshTokens.revokedAt })
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, session.userId));
      expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);
    });

    it('silinmekte olan hesap API kullanamaz', async () => {
      const session = await signIn(app, { provider: 'apple', subject: 'hesap-silme-erisim-1' });
      await app.inject({ method: 'DELETE', url: '/v1/me', headers: authHeader(session) });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: authHeader(session),
      });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: { code: ErrorCode.ACCOUNT_DELETION_IN_PROGRESS },
      });
    });

    it('silinmekte olan hesaba yeniden giriş yapılamaz', async () => {
      const session = await signIn(app, {
        provider: 'apple',
        subject: 'hesap-silme-giris-1',
        email: 'tekrar-giris@example.com',
      });
      await app.inject({ method: 'DELETE', url: '/v1/me', headers: authHeader(session) });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/apple',
        payload: { idToken: 'mock:hesap-silme-giris-1:tekrar-giris@example.com' },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: { code: ErrorCode.ACCOUNT_DELETION_IN_PROGRESS },
      });
    });
  });
});
