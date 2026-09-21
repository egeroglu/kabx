import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * ESM'de `require.main === module` karşılığı: dosya doğrudan `node`/`tsx` ile mi
 * çalıştırıldı, yoksa başka bir modül tarafından mı import edildi?
 *
 * Kullanım: `if (isMainModule(import.meta.url)) { ... }`
 */
export function isMainModule(importMetaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return importMetaUrl === pathToFileURL(path.resolve(entry)).href;
}
