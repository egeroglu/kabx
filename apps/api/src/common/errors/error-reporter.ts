import { Injectable } from '@nestjs/common';
import type * as SentryNode from '@sentry/node';

import { AppConfig } from '../config/app-config.js';
import { getRootLogger } from '../logging/logger.js';

export type ErrorReportContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  extra?: Record<string, unknown>;
};

/**
 * Hata takibi bir arayüz arkasında (BACKEND_SPEC §8.5): yerelde ve testlerde
 * anahtar olmadan çalışır, production'da Sentry'ye bağlanır.
 */
export abstract class ErrorReporter {
  abstract capture(error: unknown, context?: ErrorReportContext): void;
  abstract flush(timeoutMs?: number): Promise<void>;
}

@Injectable()
export class NoopErrorReporter extends ErrorReporter {
  capture(error: unknown, context?: ErrorReportContext): void {
    getRootLogger().debug({ context, err: error }, 'error reporter devre dışı (DSN yok)');
  }

  async flush(): Promise<void> {
    /* no-op */
  }
}

@Injectable()
export class SentryErrorReporter extends ErrorReporter {
  // Sentry SDK'sı yalnızca DSN varsa yüklenir; mock modda hiç import edilmez.
  private sdk: typeof SentryNode | undefined;

  constructor(private readonly config: AppConfig) {
    super();
  }

  async init(): Promise<void> {
    const dsn = this.config.get('SENTRY_DSN');
    if (!dsn) return;
    this.sdk = await import('@sentry/node');
    this.sdk.init({
      dsn,
      environment: this.config.get('NODE_ENV'),
      tracesSampleRate: this.config.get('SENTRY_TRACES_SAMPLE_RATE'),
    });
  }

  capture(error: unknown, context?: ErrorReportContext): void {
    if (!this.sdk) return;
    this.sdk.withScope((scope) => {
      if (context?.requestId) scope.setTag('requestId', context.requestId);
      if (context?.route) scope.setTag('route', context.route);
      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.extra) scope.setExtras(context.extra);
      this.sdk?.captureException(error);
    });
  }

  async flush(timeoutMs = 2000): Promise<void> {
    await this.sdk?.flush(timeoutMs);
  }
}

export async function createErrorReporter(config: AppConfig): Promise<ErrorReporter> {
  if (!config.get('SENTRY_DSN')) return new NoopErrorReporter();
  const reporter = new SentryErrorReporter(config);
  await reporter.init();
  return reporter;
}
