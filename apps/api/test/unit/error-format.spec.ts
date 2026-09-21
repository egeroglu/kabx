import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z, ZodError } from 'zod';

import { AppConfig, validateEnv } from '../../src/common/config/app-config.js';
import { AppException } from '../../src/common/errors/app.exception.js';
import { ALL_ERROR_CODES, ErrorCode } from '../../src/common/errors/error-codes.js';
import { NoopErrorReporter } from '../../src/common/errors/error-reporter.js';
import { GlobalExceptionFilter } from '../../src/common/errors/global-exception.filter.js';

type Captured = {
  status: number;
  body: { error: { code: string; message: string; details?: unknown } };
};

function runFilter(
  exception: unknown,
  nodeEnv: 'development' | 'production' = 'development',
): Captured {
  const config = new AppConfig(
    validateEnv({
      NODE_ENV: nodeEnv,
      DATABASE_URL: 'postgres://kabx:kabx@localhost:55432/kabx',
      REDIS_URL: 'redis://localhost:56379',
    }),
  );
  const filter = new GlobalExceptionFilter(config, new NoopErrorReporter());

  const captured = {} as Captured;
  const reply = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    send(body: Captured['body']) {
      captured.body = body;
      return this;
    },
  };
  const request = { id: 'req-1', method: 'GET', url: '/v1/x', routeOptions: { url: '/v1/x' } };

  filter.catch(exception, {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => request }),
  } as never);

  return captured;
}

describe('hata cevabı tek formatta (BACKEND_SPEC §3.6)', () => {
  it('AppException kodunu ve durumunu korur', () => {
    const result = runFilter(
      AppException.notFound(ErrorCode.WARDROBE_ITEM_NOT_FOUND, 'item yok', { id: 'x' }),
    );
    expect(result.status).toBe(404);
    expect(result.body).toEqual({
      error: { code: 'WARDROBE_ITEM_NOT_FOUND', message: 'item yok', details: { id: 'x' } },
    });
  });

  it('her cevapta yalnızca `error` anahtarı bulunur', () => {
    const result = runFilter(AppException.forbidden());
    expect(Object.keys(result.body)).toEqual(['error']);
    expect(Object.keys(result.body.error).sort()).toEqual(['code', 'message']);
  });

  it('Zod hatası VALIDATION_FAILED ve alan listesi döner', () => {
    const error = new ZodError(
      z.object({ limit: z.number() }).safeParse({ limit: 'x' }).error!.issues,
    );
    const result = runFilter(error);
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(result.body.error.details).toMatchObject({
      issues: [expect.objectContaining({ path: 'limit' })],
    });
  });

  it('Nest HttpException uygun koda eşlenir', () => {
    expect(runFilter(new NotFoundException()).body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(runFilter(new HttpException('nope', HttpStatus.TOO_MANY_REQUESTS)).body.error.code).toBe(
      ErrorCode.RATE_LIMITED,
    );
  });

  it("beklenmeyen hata production'da ayrıntı sızdırmaz", () => {
    const result = runFilter(new Error('şifre tablosu bozuk: secret=abc'), 'production');
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(result.body.error.message).toBe('Internal server error');
    expect(JSON.stringify(result.body)).not.toContain('secret=abc');
  });

  it("beklenmeyen hata development'ta ayrıntıyı geliştiriciye gösterir", () => {
    const result = runFilter(new Error('boom'), 'development');
    expect(result.body.error.message).toBe('boom');
  });

  it('beklenmeyen hata hata takibine bildirilir, bilinen hata bildirilmez', () => {
    const reporter = new NoopErrorReporter();
    const capture = vi.spyOn(reporter, 'capture');
    const config = new AppConfig(
      validateEnv({
        DATABASE_URL: 'postgres://kabx:kabx@localhost:55432/kabx',
        REDIS_URL: 'redis://localhost:56379',
      }),
    );
    const filter = new GlobalExceptionFilter(config, reporter);
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ send: () => undefined }) }),
        getRequest: () => ({ id: 'r', url: '/v1/x' }),
      }),
    } as never;

    filter.catch(AppException.forbidden(), host);
    expect(capture).not.toHaveBeenCalled();

    filter.catch(new Error('beklenmeyen'), host);
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

describe('hata kodları sözlüğü', () => {
  it('kodlar benzersiz', () => {
    expect(new Set(ALL_ERROR_CODES).size).toBe(ALL_ERROR_CODES.length);
  });

  it('kodlar SCREAMING_SNAKE_CASE — mobilde i18n anahtarı olarak kullanılıyor', () => {
    for (const code of ALL_ERROR_CODES) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it('enum anahtarı ile değeri aynı — yanlış eşleme olamaz', () => {
    for (const [key, value] of Object.entries(ErrorCode)) {
      expect(value).toBe(key);
    }
  });
});
