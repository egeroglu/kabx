import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { validateEnv } from '../common/config/app-config.js';
import { loadEnvFile } from '../common/config/load-env-file.js';
import { isMainModule } from '../common/node/is-main.js';
import { createDbHandleFromUrl } from './client.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const MIGRATIONS_FOLDER = path.join(here, 'migrations');

export async function runMigrations(databaseUrl: string): Promise<void> {
  // Migration'lar tek bağlantı üzerinden çalışmalı (advisory lock aynı oturumda tutulur).
  const handle = createDbHandleFromUrl(databaseUrl, { max: 1 });
  try {
    await migrate(handle.db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await handle.close();
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  const env = validateEnv(process.env);
  await runMigrations(env.DATABASE_URL);
  process.stdout.write("Migration'lar uygulandı.\n");
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`Migration başarısız: ${String(error)}\n`);
    process.exit(1);
  });
}
