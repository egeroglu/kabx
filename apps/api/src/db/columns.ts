import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

/**
 * Tüm tablolarda ortak sütunlar (BACKEND_SPEC §7).
 *
 * ID'ler UUID **v7**: zaman sıralı olduğu için birincil anahtar indeksinde
 * rastgele UUID'ye göre çok daha az sayfa bölünmesi yaratır ve keyset
 * sayfalamada doğal sıralama anahtarı olur.
 */
export const primaryId = () => uuid('id').primaryKey().$defaultFn(uuidv7);

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`);

export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date());

export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export { uuidv7 };
