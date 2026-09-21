import { boolean, index, jsonb, pgTable, text, varchar } from 'drizzle-orm/pg-core';

import { primaryId, timestamps } from '../columns.js';

/**
 * Remote config ve feature flag'ler (BACKEND_SPEC §5.12).
 *
 * Değerler JSONB: sayı, dizi, nesne hepsi aynı tabloda durur. Redis'te
 * cache'lenir. `isPublic` true olanlar `GET /v1/config` ile istemciye açılır —
 * sunucu tarafı eşikler (AI kotaları, skor ağırlıkları) istemciye sızmaz.
 */
export const appConfig = pgTable(
  'app_config',
  {
    id: primaryId(),
    /** Nokta ile ayrılmış anahtar: `discovery.exploration_ratio` gibi. */
    key: varchar('key', { length: 128 }).notNull().unique(),
    value: jsonb('value').notNull(),
    description: text('description'),
    /** true ise GET /v1/config cevabına girer. */
    isPublic: boolean('is_public').notNull().default(false),
    ...timestamps(),
  },
  (table) => [index('app_config_public_idx').on(table.isPublic)],
);

export type AppConfigRow = typeof appConfig.$inferSelect;
export type NewAppConfigRow = typeof appConfig.$inferInsert;
