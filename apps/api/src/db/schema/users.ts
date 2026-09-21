import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { primaryId, timestamps } from '../columns.js';

export const localeEnum = pgEnum('locale', ['tr', 'en']);
export const stylePreferenceEnum = pgEnum('style_preference', ['women', 'men', 'all']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
/**
 * `pending_deletion`: kullanıcı silme istedi, kuyruktaki iş henüz bitmedi.
 * Bu aradaki her istek reddedilir; hesap geri açılamaz.
 */
export const userStatusEnum = pgEnum('user_status', ['active', 'pending_deletion']);

export type NotificationPreferences = {
  /** Sabah "bugünün kombini" bildirimi (§5.6). */
  dailyOutfit: boolean;
  /** Wishlist "hâlâ istiyor musun?" hatırlatması (§5.10). */
  wishlistReview: boolean;
  /** Gardırop temizliği hatırlatması (§5.11). */
  cleanupReminder: boolean;
  /** Kullanıcının yerel saatine göre bildirim saati (0-23). */
  dailyOutfitHour: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyOutfit: true,
  wishlistReview: true,
  cleanupReminder: true,
  dailyOutfitHour: 8,
};

export const users = pgTable(
  'users',
  {
    id: primaryId(),
    /**
     * Küçük harfe normalize edilmiş e-posta. Apple'ın gizli e-posta
     * yönlendirmesi kullanıldığında da burada durur. Kullanıcı yalnızca
     * Apple/Google ile girdiyse ve e-posta paylaşmadıysa null olabilir.
     */
    email: varchar('email', { length: 320 }).unique(),
    emailVerified: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
    displayName: varchar('display_name', { length: 80 }),
    locale: localeEnum('locale').notNull().default('tr'),

    // Hava durumu için konum (§5.7). Koordinat yuvarlanmış tutulur.
    city: varchar('city', { length: 120 }),
    latitude: real('latitude'),
    longitude: real('longitude'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Istanbul'),

    stylePreference: stylePreferenceEnum('style_preference').notNull().default('women'),
    /** Onboarding'in hangi adımına kadar gelindiği; istemci akışı buna göre kurar. */
    onboardingCompletedAt: timestamp('onboarding_completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    notificationPreferences: jsonb('notification_preferences')
      .$type<NotificationPreferences>()
      .notNull()
      .default(DEFAULT_NOTIFICATION_PREFERENCES),

    role: userRoleEnum('role').notNull().default('user'),
    status: userStatusEnum('status').notNull().default('active'),
    deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true, mode: 'date' }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }),
    ...timestamps(),
  },
  (table) => [
    index('users_status_idx').on(table.status),
    // Silme kuyruğunu tarayan cron için.
    index('users_deletion_requested_idx').on(table.deletionRequestedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const identityProviderEnum = pgEnum('identity_provider', ['apple', 'google', 'email']);

/**
 * Bir kullanıcının birden çok giriş yöntemi olabilir; aynı e-postayla hem
 * Apple hem Google ile gelen kişi TEK kullanıcıya bağlanır.
 */
export const authIdentities = pgTable(
  'auth_identities',
  {
    id: primaryId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: identityProviderEnum('provider').notNull(),
    /** Sağlayıcının kararlı kullanıcı kimliği (Apple/Google `sub`, e-posta için adresin kendisi). */
    subject: varchar('subject', { length: 255 }).notNull(),
    /** Sağlayıcının bildirdiği e-posta; kullanıcının asıl e-postasından farklı olabilir. */
    email: varchar('email', { length: 320 }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
    ...timestamps(),
  },
  (table) => [
    index('auth_identities_user_idx').on(table.userId),
    // Bir sağlayıcı kimliği tek kullanıcıya bağlanabilir — hesap ele geçirmeye
    // karşı temel kısıt.
    unique('auth_identities_provider_subject_key').on(table.provider, table.subject),
  ],
);

export type AuthIdentity = typeof authIdentities.$inferSelect;
export type NewAuthIdentity = typeof authIdentities.$inferInsert;
