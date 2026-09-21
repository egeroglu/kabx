import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMainModule } from '../node/is-main.js';
import { createApiApp } from '../../bootstrap/create-api-app.js';
import { buildOpenApiDocument } from './document.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Proje kökündeki openapi.json — mobil tipli client bundan üretilecek. */
export const OPENAPI_OUTPUT = path.resolve(here, '../../../openapi.json');

/**
 * OpenAPI şemasını dosyaya yazar. Mobil taraf bu dosyadan tipli client üretecek
 * (MOBILE_SPEC §3.2). CI bu dosyanın güncel olduğunu kontrol eder.
 */
export async function exportOpenApi(outputPath = OPENAPI_OUTPUT): Promise<string> {
  const app = await createApiApp();
  try {
    await app.init();
    const document = buildOpenApiDocument(app);
    const json = `${JSON.stringify(document, null, 2)}\n`;
    writeFileSync(outputPath, json, 'utf8');
    return outputPath;
  } finally {
    await app.close();
  }
}

if (isMainModule(import.meta.url)) {
  exportOpenApi()
    .then((file) => {
      process.stdout.write(`OpenAPI yazıldı: ${file}\n`);
      process.exit(0);
    })
    .catch((error: unknown) => {
      process.stderr.write(`OpenAPI üretilemedi: ${String(error)}\n`);
      process.exit(1);
    });
}
