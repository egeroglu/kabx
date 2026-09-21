import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { envSchema, type Env } from './env.schema.js';
import { loadEnvFile } from './load-env-file.js';

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Ortam değişkenleri geçersiz:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Süreç açılışında bir kez çalışır. Geçersizse süreç ayağa kalkmaz (fail-fast).
 */
export function validateEnv(raw: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map(
        (i: z.core.$ZodIssue) => `${i.path.join('.') || '(kök)'}: ${i.message}`,
      ),
    );
  }
  return result.data;
}

/**
 * Tip güvenli config erişimi. `process.env` yalnızca burada okunur.
 */
@Injectable()
export class AppConfig {
  constructor(private readonly env: Env) {}

  /**
   * Süreç girişlerinin (API, worker, CLI script'leri) tek config kaynağı.
   * `.env` varsa yüklenir; tanımlı ortam değişkenleri ezilmez.
   */
  static fromProcessEnv(): AppConfig {
    loadEnvFile();
    return new AppConfig(validateEnv(process.env));
  }

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }

  get all(): Readonly<Env> {
    return this.env;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  /** Virgülle ayrılmış CORS listesi; boşsa CORS kapalı. */
  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
