import 'reflect-metadata';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import type { TestProject } from 'vitest/node';

import { runMigrations } from '../src/db/migrate.js';

let postgres: StartedPostgreSqlContainer | undefined;
let redis: StartedRedisContainer | undefined;

/**
 * Vitest global setup: tüm entegrasyon testleri için BİR kez Postgres ve Redis
 * container'ı kaldırır, migration'ları uygular ve bağlantı URL'lerini testlere
 * `provide` ile geçirir.
 *
 * Postgres imajı `pgvector/pgvector` — vector eklentisi migration'da
 * CREATE EXTENSION ile açılıyor, dolayısıyla düz postgres imajı yetmez.
 */
export async function setup(project: TestProject): Promise<void> {
  // Testlerde bilerek üretilen hataların log'u çıktıyı kirletmesin.
  process.env.LOG_LEVEL ??= 'silent';
  process.env.LOG_PRETTY = 'false';

  [postgres, redis] = await Promise.all([
    new PostgreSqlContainer('pgvector/pgvector:pg17')
      .withDatabase('kabx_test')
      .withUsername('kabx')
      .withPassword('kabx')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);

  const databaseUrl = postgres.getConnectionUri();
  const redisUrl = redis.getConnectionUrl();

  await runMigrations(databaseUrl);

  project.provide('databaseUrl', databaseUrl);
  project.provide('redisUrl', redisUrl);
}

export async function teardown(): Promise<void> {
  await Promise.all([postgres?.stop(), redis?.stop()]);
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}
