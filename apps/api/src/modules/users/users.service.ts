import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';

import { AppConfig } from '../../common/config/app-config.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import {
  consents,
  dataExportJobs,
  devices,
  type Consent,
  type DataExportJob,
  type Device,
} from '../../db/schema/account.js';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  users,
  type NotificationPreferences,
  type User,
} from '../../db/schema/users.js';
import { QueueName, type QueueRegistry } from '../../queue/queue.constants.js';
import { QUEUE_REGISTRY } from '../../queue/queue.module.js';
import { AccountJobName } from '../../queue/processors/account.jobs.js';
import { TokenService } from '../auth/token.service.js';
import type { registerDeviceSchema, updateMeSchema } from './dto/users.dto.js';

export type ConsentKind = 'privacy_notice' | 'terms' | 'explicit_consent';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(QUEUE_REGISTRY) private readonly queues: QueueRegistry,
    private readonly config: AppConfig,
    private readonly tokens: TokenService,
  ) {}

  async update(user: User, patch: z.infer<typeof updateMeSchema>): Promise<User> {
    const notificationPreferences: NotificationPreferences | undefined =
      patch.notificationPreferences
        ? {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...user.notificationPreferences,
            ...patch.notificationPreferences,
          }
        : undefined;

    const [updated] = await this.db
      .update(users)
      .set({
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
        ...(patch.city !== undefined ? { city: patch.city } : {}),
        ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
        ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
        ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
        ...(patch.stylePreference !== undefined ? { stylePreference: patch.stylePreference } : {}),
        ...(notificationPreferences ? { notificationPreferences } : {}),
        // Onboarding yalnızca tamamlanabilir, geri alınamaz.
        ...(patch.onboardingCompleted && !user.onboardingCompletedAt
          ? { onboardingCompletedAt: new Date() }
          : {}),
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updated) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı');
    }
    return updated;
  }

  /** Yürürlükteki sürümlere göre kullanıcının henüz vermediği rızalar. */
  async pendingConsents(userId: string): Promise<ConsentKind[]> {
    const required: { kind: ConsentKind; version: string }[] = [
      { kind: 'privacy_notice', version: this.config.get('CONSENT_PRIVACY_VERSION') },
      { kind: 'terms', version: this.config.get('CONSENT_TERMS_VERSION') },
    ];

    const given = await this.db
      .select({ kind: consents.kind, version: consents.version })
      .from(consents)
      .where(and(eq(consents.userId, userId), isNull(consents.withdrawnAt)));

    return required
      .filter(
        (item) => !given.some((row) => row.kind === item.kind && row.version === item.version),
      )
      .map((item) => item.kind);
  }

  listConsents(userId: string): Promise<Consent[]> {
    return this.db
      .select()
      .from(consents)
      .where(eq(consents.userId, userId))
      .orderBy(desc(consents.acceptedAt));
  }

  /**
   * Rıza kaydı eklenir, güncellenmez: aynı sürüm ikinci kez gönderilirse
   * ilk onay zamanı korunur. Denetlenebilirlik için kayıt geçmişi silinmez.
   */
  async recordConsent(
    user: User,
    input: { kind: ConsentKind; version: string; locale: 'tr' | 'en' },
    context: { ip: string | null; userAgent: string | null },
  ): Promise<void> {
    await this.db
      .insert(consents)
      .values({
        userId: user.id,
        kind: input.kind,
        version: input.version,
        locale: input.locale,
        acceptedAt: new Date(),
        ip: context.ip,
        userAgent: context.userAgent?.slice(0, 255) ?? null,
      })
      .onConflictDoNothing({
        target: [consents.userId, consents.kind, consents.version],
      });
  }

  /**
   * Cihaz kaydı (§5.6). Push token benzersiz: aynı telefon başka bir hesaba
   * giriş yaparsa token yeni kullanıcıya TAŞINIR — yoksa önceki kullanıcının
   * bildirimleri yeni kullanıcının telefonuna düşerdi.
   */
  async registerDevice(user: User, input: z.infer<typeof registerDeviceSchema>): Promise<Device> {
    const now = new Date();
    const [device] = await this.db
      .insert(devices)
      .values({
        userId: user.id,
        pushToken: input.pushToken,
        platform: input.platform,
        locale: input.locale ?? user.locale,
        timezone: input.timezone ?? user.timezone,
        appVersion: input.appVersion ?? null,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: devices.pushToken,
        set: {
          userId: user.id,
          platform: input.platform,
          locale: input.locale ?? user.locale,
          timezone: input.timezone ?? user.timezone,
          appVersion: input.appVersion ?? null,
          lastSeenAt: now,
          disabledAt: null,
        },
      })
      .returning();

    if (!device) throw new Error('Cihaz kaydedilemedi');
    return device;
  }

  listDevices(userId: string): Promise<Device[]> {
    return this.db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.lastSeenAt));
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    const removed = await this.db
      .delete(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
      .returning({ id: devices.id });

    // Başkasının cihazı da "bulunamadı" döner: varlık bilgisi sızmasın.
    if (removed.length === 0) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'Cihaz bulunamadı');
    }
  }

  /**
   * Hesap silme (Apple kuralı + KVKK).
   *
   * İstek anında yapılan tek şey: hesabı `pending_deletion` işaretlemek ve tüm
   * oturumları düşürmek. Asıl silme (S3 objeleri, RevenueCat müşteri kaydı,
   * ilişkili satırlar) kuyrukta yapılır; istemciye hemen 202 döner.
   */
  async requestDeletion(user: User): Promise<void> {
    await this.db
      .update(users)
      .set({ status: 'pending_deletion', deletionRequestedAt: new Date() })
      .where(eq(users.id, user.id));

    await this.tokens.revokeAllForUser(user.id, 'account_deleted');

    await this.queues.get(QueueName.ACCOUNT).add(
      AccountJobName.DELETE_ACCOUNT,
      { userId: user.id },
      // Kullanıcı iki kez basarsa tek iş oluşsun.
      // NOT: BullMQ özel job ID'sinde ':' KULLANILAMAZ (kendi anahtar ayracı).
      { jobId: `delete-account-${user.id}` },
    );
  }

  /** Veri dışa aktarma (KVKK): iş kuyruğa atılır, istemci durumu sorgular. */
  async requestExport(user: User): Promise<DataExportJob> {
    const existing = await this.db
      .select()
      .from(dataExportJobs)
      .where(eq(dataExportJobs.userId, user.id))
      .orderBy(desc(dataExportJobs.createdAt))
      .limit(1);

    // Sürmekte olan bir iş varsa yenisini açma; aynı işi tekrar tekrar
    // kuyruğa atmak hem maliyetli hem anlamsız.
    const current = existing[0];
    if (current && (current.status === 'pending' || current.status === 'processing')) {
      return current;
    }

    const [job] = await this.db
      .insert(dataExportJobs)
      .values({ userId: user.id, status: 'pending' })
      .returning();

    if (!job) throw new Error('Dışa aktarma işi oluşturulamadı');

    await this.queues.get(QueueName.ACCOUNT).add(
      AccountJobName.EXPORT_DATA,
      { userId: user.id, jobId: job.id },
      // ':' BullMQ'da yasak (yukarıdaki nota bak).
      { jobId: `export-${job.id}` },
    );

    return job;
  }

  async getExportJob(userId: string, jobId: string): Promise<DataExportJob> {
    const [job] = await this.db
      .select()
      .from(dataExportJobs)
      .where(and(eq(dataExportJobs.id, jobId), eq(dataExportJobs.userId, userId)))
      .limit(1);

    if (!job) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'Dışa aktarma işi bulunamadı');
    }
    return job;
  }
}
