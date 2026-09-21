import { index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { primaryId, timestamps } from '../columns.js';
import { users } from './users.js';

export const refreshRevokeReasonEnum = pgEnum('refresh_revoke_reason', [
  'rotated',
  'logout',
  'reuse_detected',
  'account_deleted',
  'device_removed',
]);

/**
 * Rotasyonlu refresh token'lar (BACKEND_SPEC §4).
 *
 * Token'ın kendisi ASLA saklanmaz; yalnızca HMAC'i. Her yenilemede yeni bir
 * token üretilir ve eskisi `rotated` olarak işaretlenir. Aynı token ikinci kez
 * kullanılırsa (`usedAt` dolu) bu, çalınmış token belirtisidir: o `familyId`'ye
 * ait TÜM zincir iptal edilir.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Rotasyon zinciri kimliği; ilk girişte üretilir, yenilemelerde taşınır. */
    familyId: uuid('family_id').notNull(),
    /** HMAC-SHA256(token, AUTH_HASH_SECRET) — ham token DB'ye girmez. */
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    /** Bu token'ın yerini alan kayıt; zinciri izlemek için. */
    replacedBy: uuid('replaced_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    revokeReason: refreshRevokeReasonEnum('revoke_reason'),
    /** Hangi cihazdan verildiği — oturum listesinde ve iptalde kullanılır. */
    deviceLabel: varchar('device_label', { length: 120 }),
    userAgent: varchar('user_agent', { length: 255 }),
    ...timestamps(),
  },
  (table) => [
    index('refresh_tokens_user_idx').on(table.userId),
    index('refresh_tokens_family_idx').on(table.familyId),
    // Süresi geçmiş kayıtları temizleyen cron için.
    index('refresh_tokens_expires_idx').on(table.expiresAt),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export const otpPurposeEnum = pgEnum('otp_purpose', ['login']);

/**
 * E-posta ile tek kullanımlık kod girişi.
 *
 * Kod da HMAC'lenerek saklanır: 6 haneli kod düşük entropili olduğu için
 * veritabanı sızarsa düz metin kodlar doğrudan kullanılabilir olurdu.
 * Denemeler sayılır, `OTP_MAX_ATTEMPTS` aşılınca kayıt tüketilmiş sayılır.
 */
export const emailOtps = pgTable(
  'email_otps',
  {
    id: primaryId(),
    email: varchar('email', { length: 320 }).notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    purpose: otpPurposeEnum('purpose').notNull().default('login'),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    requestIp: varchar('request_ip', { length: 45 }),
    ...timestamps(),
  },
  (table) => [
    index('email_otps_email_idx').on(table.email),
    index('email_otps_expires_idx').on(table.expiresAt),
  ],
);

export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;
