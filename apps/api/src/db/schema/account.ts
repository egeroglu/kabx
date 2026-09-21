import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { primaryId, timestamps } from '../columns.js';
import { localeEnum, users } from './users.js';

export const consentKindEnum = pgEnum('consent_kind', [
  /** KVKK aydınlatma metni. */
  'privacy_notice',
  /** Kullanım koşulları. */
  'terms',
  /** KVKK açık rıza (kişiselleştirme ve yapay zekâ işleme). */
  'explicit_consent',
]);

/**
 * Rıza kayıtları (BACKEND_SPEC §4, KVKK).
 *
 * Kayıt SİLİNMEZ, yalnızca eklenir: bir metnin hangi sürümünün ne zaman
 * onaylandığı denetlenebilir kalmalı. Metin değişince sürüm yükseltilir ve
 * kullanıcıdan yeniden onay istenir.
 */
export const consents = pgTable(
  'consents',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: consentKindEnum('kind').notNull(),
    /** Onaylanan metnin sürümü (örn. '2026-09-01'). */
    version: varchar('version', { length: 32 }).notNull(),
    locale: localeEnum('locale').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** Geri çekilen rıza; kayıt silinmez, geri çekilme zamanı yazılır. */
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' }),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 255 }),
    ...timestamps(),
  },
  (table) => [
    index('consents_user_idx').on(table.userId),
    unique('consents_user_kind_version_key').on(table.userId, table.kind, table.version),
  ],
);

export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;

export const devicePlatformEnum = pgEnum('device_platform', ['ios', 'android']);

/** Push bildirimi hedefleri (BACKEND_SPEC §5.6). */
export const devices = pgTable(
  'devices',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * Expo push token. Benzersiz: aynı cihaz başka bir hesaba giriş yaparsa
     * token yeni kullanıcıya TAŞINIR, yoksa önceki kullanıcının bildirimleri
     * yeni kullanıcının telefonuna düşer.
     */
    pushToken: varchar('push_token', { length: 255 }).notNull().unique(),
    platform: devicePlatformEnum('platform').notNull(),
    locale: localeEnum('locale').notNull().default('tr'),
    timezone: varchar('timezone', { length: 64 }),
    appVersion: varchar('app_version', { length: 32 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** Push sağlayıcısı token'ı geçersiz dedi; artık gönderme. */
    disabledAt: timestamp('disabled_at', { withTimezone: true, mode: 'date' }),
    ...timestamps(),
  },
  (table) => [index('devices_user_idx').on(table.userId)],
);

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export const exportStatusEnum = pgEnum('export_status', [
  'pending',
  'processing',
  'ready',
  'failed',
]);

/** KVKK veri dışa aktarma işleri (BACKEND_SPEC §4). */
export const dataExportJobs = pgTable(
  'data_export_jobs',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: exportStatusEnum('status').notNull().default('pending'),
    /** Üretilen zip'in obje deposundaki anahtarı. */
    objectKey: varchar('object_key', { length: 512 }),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    /** Süreli link bu tarihten sonra çalışmaz; dosya da cron ile silinir. */
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    failureReason: text('failure_reason'),
    ...timestamps(),
  },
  (table) => [
    index('data_export_jobs_user_idx').on(table.userId),
    index('data_export_jobs_status_idx').on(table.status),
  ],
);

export type DataExportJob = typeof dataExportJobs.$inferSelect;
export type NewDataExportJob = typeof dataExportJobs.$inferInsert;
