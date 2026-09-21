import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * `.env` dosyasını sürece yükler.
 *
 * `process.loadEnvFile` Node 24'ün yerleşik API'si (dotenv bağımlılığı yok) ve
 * ZATEN TANIMLI ortam değişkenlerini EZMEZ — yani kabuk/CI/container ortamı
 * her zaman dosyanın önünde gelir. Production'da `.env` dosyası bulunmaz;
 * değerler secret manager'dan gerçek ortam değişkeni olarak gelir.
 */
export function loadEnvFile(cwd = process.cwd()): string | null {
  const explicit = process.env.ENV_FILE;
  const candidate = explicit ? path.resolve(cwd, explicit) : path.resolve(cwd, '.env');

  if (!existsSync(candidate)) return null;

  process.loadEnvFile(candidate);
  return candidate;
}
