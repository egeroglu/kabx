import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit yapılandırması.
 * `npm run db:generate` şema değişikliklerinden SQL migration üretir;
 * üretilen dosyalar repoda versiyonlu tutulur (BACKEND_SPEC §2).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://kabx:kabx@localhost:55432/kabx',
  },
  strict: true,
  verbose: true,
});
