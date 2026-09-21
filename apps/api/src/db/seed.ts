import { sql } from 'drizzle-orm';

import { validateEnv } from '../common/config/app-config.js';
import { loadEnvFile } from '../common/config/load-env-file.js';
import { isMainModule } from '../common/node/is-main.js';
import { createDbHandleFromUrl, type Database } from './client.js';
import { appConfig } from './schema/app-config.js';
import { APP_CONFIG_DEFAULTS } from './seed-data/app-config.defaults.js';

/**
 * Seed idempotenttir: tekrar çalıştırmak güvenlidir. Var olan anahtarların
 * DEĞERİNE dokunulmaz (operatör canlıda değiştirmiş olabilir); yalnızca
 * açıklama ve görünürlük güncellenir, eksik anahtarlar eklenir.
 *
 * Demo verisi (mock ürünler, editör kombinleri, quiz seti, test kullanıcısı)
 * ilgili tablolar geldikçe Faz 1/3/6'da bu dosyaya eklenecek.
 */
export async function seed(db: Database): Promise<{ appConfigKeys: number }> {
  await db
    .insert(appConfig)
    .values(APP_CONFIG_DEFAULTS)
    .onConflictDoUpdate({
      target: appConfig.key,
      set: {
        description: sql`excluded.description`,
        isPublic: sql`excluded.is_public`,
        updatedAt: new Date(),
      },
    });

  return { appConfigKeys: APP_CONFIG_DEFAULTS.length };
}

async function main(): Promise<void> {
  loadEnvFile();
  const env = validateEnv(process.env);
  const handle = createDbHandleFromUrl(env.DATABASE_URL, { max: 1 });
  try {
    const result = await seed(handle.db);
    process.stdout.write(`Seed tamam: ${result.appConfigKeys} config anahtarı.\n`);
  } finally {
    await handle.close();
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`Seed başarısız: ${String(error)}\n`);
    process.exit(1);
  });
}
