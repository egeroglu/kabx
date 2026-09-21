import { describe, expect, it } from 'vitest';

import { EnvValidationError, validateEnv } from '../../src/common/config/app-config.js';

const MINIMAL = {
  DATABASE_URL: 'postgres://kabx:kabx@localhost:55432/kabx',
  REDIS_URL: 'redis://localhost:56379',
};

describe('validateEnv', () => {
  it('zorunlu alanlar eksikse süreci ayağa kaldırmaz', () => {
    expect(() => validateEnv({})).toThrow(EnvValidationError);
  });

  it('eksik alanların adını hata mesajında sayar', () => {
    try {
      validateEnv({});
      expect.unreachable('doğrulama hata vermeliydi');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const issues = (error as EnvValidationError).issues.join('\n');
      expect(issues).toContain('DATABASE_URL');
      expect(issues).toContain('REDIS_URL');
    }
  });

  it('minimal ortamda varsayılanları doldurur', () => {
    const env = validateEnv(MINIMAL);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3000);
    expect(env.DEFAULT_TIMEZONE).toBe('Europe/Istanbul');
  });

  it('dış servisler varsayılan olarak mock modunda — anahtarsız çalışır', () => {
    const env = validateEnv(MINIMAL);
    expect(env.AI_PROVIDER).toBe('mock');
    expect(env.STORAGE_PROVIDER).toBe('mock');
    expect(env.SUBSCRIPTIONS_PROVIDER).toBe('mock');
    expect(env.WEATHER_PROVIDER).toBe('mock');
    expect(env.PUSH_PROVIDER).toBe('mock');
    expect(env.EMAIL_PROVIDER).toBe('mock');
  });

  it('model adları env üzerinden gelir, kodda sabit değildir', () => {
    const env = validateEnv({
      ...MINIMAL,
      GEMINI_TAGGING_MODEL: 'baska-model',
      EMBEDDING_DIM: '1536',
    });
    expect(env.GEMINI_TAGGING_MODEL).toBe('baska-model');
    expect(env.EMBEDDING_DIM).toBe(1536);
  });

  it('boolean değerleri dize biçiminden çevirir', () => {
    expect(validateEnv({ ...MINIMAL, LOG_PRETTY: 'true' }).LOG_PRETTY).toBe(true);
    expect(validateEnv({ ...MINIMAL, LOG_PRETTY: '0' }).LOG_PRETTY).toBe(false);
    expect(validateEnv({ ...MINIMAL, LOG_PRETTY: 'yes' }).LOG_PRETTY).toBe(true);
  });

  it('geçersiz sayısal değeri reddeder', () => {
    expect(() => validateEnv({ ...MINIMAL, API_PORT: 'abc' })).toThrow(EnvValidationError);
  });

  it('kısa JWT sırrını reddeder', () => {
    expect(() => validateEnv({ ...MINIMAL, JWT_ACCESS_SECRET: 'kisa' })).toThrow(
      EnvValidationError,
    );
  });
});
