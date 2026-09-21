// tsc yalnızca .ts dosyalarını derler; Drizzle'ın .sql migration'ları ve
// meta/_journal.json dist'e kopyalanmazsa production imajında migration
// çalıştırılamaz. Bu script derlemeden sonra onları taşır.
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'src', 'db', 'migrations');
const to = path.join(root, 'dist', 'db', 'migrations');

if (!existsSync(from)) {
  console.error(`Migration klasörü bulunamadı: ${from}`);
  process.exit(1);
}

cpSync(from, to, { recursive: true });
console.warn(`Migration dosyaları kopyalandı → ${path.relative(root, to)}`);
