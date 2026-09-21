import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { inject } from 'vitest';

import { createApiApp } from '../../src/bootstrap/create-api-app.js';

/**
 * Entegrasyon testleri için gerçek API uygulamasını ayağa kaldırır —
 * global filter, pipe ve Fastify eklentileri dahil. Böylece testler
 * production'daki cevap şeklini doğrular, yaklaşık bir kopyayı değil.
 */
export async function createTestApp(): Promise<NestFastifyApplication> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = inject('databaseUrl');
  process.env.REDIS_URL = inject('redisUrl');
  process.env.LOG_LEVEL = 'silent';
  process.env.LOG_PRETTY = 'false';
  process.env.OPENAPI_ENABLED = 'true';
  // Test başına ayrı kuyruk öneki: testler birbirinin işlerini görmesin.
  process.env.QUEUE_PREFIX = `kabxtest-${Math.random().toString(36).slice(2, 8)}`;

  const app = await createApiApp();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
