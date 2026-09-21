import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';

import { createDbHandleFromUrl, type DbHandle } from '../../src/db/client.js';
import { appConfig } from '../../src/db/schema/app-config.js';
import { seed } from '../../src/db/seed.js';
import { APP_CONFIG_DEFAULTS } from '../../src/db/seed-data/app-config.defaults.js';

/**
 * Migration'lar global setup'ta temiz bir veritabanına zaten uygulandı;
 * burada sonucun beklediğimiz şema olduğunu doğruluyoruz.
 */
describe('migration ve seed', () => {
  let handle: DbHandle;

  beforeAll(() => {
    handle = createDbHandleFromUrl(inject('databaseUrl'), { max: 2 });
  });

  afterAll(async () => {
    await handle.close();
  });

  it('pgvector eklentisi açık — embedding sütunları buna dayanacak', async () => {
    const rows = await handle.sql<{ extname: string }[]>`
      select extname from pg_extension where extname = 'vector'
    `;
    expect(rows).toHaveLength(1);
  });

  it('app_config tablosu oluşturuldu', async () => {
    const rows = await handle.sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = 'app_config'
    `;
    expect(rows).toHaveLength(1);
  });

  it('key üzerinde benzersizlik kısıtı var', async () => {
    const rows = await handle.sql<{ constraint_type: string }[]>`
      select tc.constraint_type
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
      where tc.table_name = 'app_config'
        and kcu.column_name = 'key'
        and tc.constraint_type = 'UNIQUE'
    `;
    expect(rows).toHaveLength(1);
  });

  it('seed idempotent: iki kez çalıştırmak kayıt çoğaltmaz', async () => {
    await seed(handle.db);
    await seed(handle.db);

    const [row] = await handle.db.select({ count: sql<number>`count(*)::int` }).from(appConfig);
    expect(row?.count).toBe(APP_CONFIG_DEFAULTS.length);
  });

  it('seed var olan değeri EZMEZ — operatörün canlıda yaptığı değişiklik korunur', async () => {
    await seed(handle.db);
    await handle.sql`update app_config set value = '0.75'::jsonb where key = 'discovery.exploration_ratio'`;

    await seed(handle.db);

    const rows = await handle.sql<{ value: unknown }[]>`
      select value from app_config where key = 'discovery.exploration_ratio'
    `;
    expect(rows[0]?.value).toBe(0.75);
  });

  it('premium özellik listesi boş başlar — deneme sonrası her şey açık', async () => {
    await seed(handle.db);
    const rows = await handle.sql<{ value: unknown; is_public: boolean }[]>`
      select value, is_public from app_config where key = 'premium.locked_features'
    `;
    expect(rows[0]?.value).toEqual([]);
    expect(rows[0]?.is_public).toBe(true);
  });

  it("UUID v7 kullanılıyor: id'ler sürüm alanında 7 taşır", async () => {
    const rows = await handle.sql<{ id: string }[]>`select id from app_config limit 5`;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.id[14]).toBe('7');
    }
  });
});
