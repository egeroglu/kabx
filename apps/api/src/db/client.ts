import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { AppConfig } from '../common/config/app-config.js';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export type DbHandle = {
  db: Database;
  sql: postgres.Sql;
  close: () => Promise<void>;
};

export function createDbHandle(config: AppConfig): DbHandle {
  return createDbHandleFromUrl(config.get('DATABASE_URL'), {
    max: config.get('DATABASE_POOL_MAX'),
    ssl: config.get('DATABASE_SSL'),
  });
}

export function createDbHandleFromUrl(
  url: string,
  options: { max?: number; ssl?: boolean; maxLifetimeSeconds?: number } = {},
): DbHandle {
  const sql = postgres(url, {
    max: options.max ?? 10,
    ssl: options.ssl ? 'require' : false,
    // Bağlantıları süresiz tutma: yeniden başlatılan replikalarda kopuk soket kalmasın.
    max_lifetime: options.maxLifetimeSeconds ?? 60 * 30,
    onnotice: () => {
      /* Postgres NOTICE'leri log'u doldurmasın */
    },
  });

  const db = drizzle(sql, { schema });

  return {
    db,
    sql,
    close: async () => {
      await sql.end({ timeout: 5 });
    },
  };
}
