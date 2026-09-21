import 'reflect-metadata';

import { AppConfig } from './common/config/app-config.js';
import { getRootLogger } from './common/logging/logger.js';
import { createApiApp } from './bootstrap/create-api-app.js';

async function main(): Promise<void> {
  const app = await createApiApp();
  const config = app.get(AppConfig);

  const port = config.get('API_PORT');
  const host = config.get('API_HOST');
  await app.listen({ port, host });

  getRootLogger().info(
    { port, host, docs: config.get('OPENAPI_ENABLED') ? `http://localhost:${port}/v1/docs` : null },
    'Kabx API ayakta',
  );
}

main().catch((error: unknown) => {
  getRootLogger().fatal({ err: error }, 'API başlatılamadı');
  process.exit(1);
});
