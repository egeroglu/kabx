import { Injectable, type LoggerService, Scope } from '@nestjs/common';
import pino, { type Logger as PinoLogger } from 'pino';

import type { Env } from '../config/env.schema.js';
import { REDACT_PATHS } from './redaction.js';

export type LogContext = Record<string, unknown>;

let rootLogger: PinoLogger | undefined;

export function createRootLogger(
  env: Pick<Env, 'LOG_LEVEL' | 'LOG_PRETTY' | 'NODE_ENV'>,
): PinoLogger {
  return pino({
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    base: { env: env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    ...(env.LOG_PRETTY
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l' },
          },
        }
      : {}),
  });
}

export function setRootLogger(logger: PinoLogger): void {
  rootLogger = logger;
}

export function getRootLogger(): PinoLogger {
  rootLogger ??= pino({ level: process.env.LOG_LEVEL ?? 'info', redact: { paths: REDACT_PATHS } });
  return rootLogger;
}

/**
 * NestJS'in Logger arayüzünü pino'ya bağlar; framework logları da JSON olur.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class PinoNestLogger implements LoggerService {
  private context?: string;

  setContext(context: string): void {
    this.context = context;
  }

  private child(extra?: LogContext) {
    return getRootLogger().child({ context: this.context, ...extra });
  }

  log(message: unknown, ...rest: unknown[]): void {
    this.child(pickContext(rest)).info(String(message));
  }

  error(message: unknown, ...rest: unknown[]): void {
    this.child(pickContext(rest)).error(String(message));
  }

  warn(message: unknown, ...rest: unknown[]): void {
    this.child(pickContext(rest)).warn(String(message));
  }

  debug(message: unknown, ...rest: unknown[]): void {
    this.child(pickContext(rest)).debug(String(message));
  }

  verbose(message: unknown, ...rest: unknown[]): void {
    this.child(pickContext(rest)).trace(String(message));
  }

  fatal(message: unknown, ...rest: unknown[]): void {
    this.child(pickContext(rest)).fatal(String(message));
  }
}

function pickContext(rest: unknown[]): LogContext | undefined {
  const last = rest.at(-1);
  if (typeof last === 'string') return { context: last };
  if (last && typeof last === 'object') return last as LogContext;
  return undefined;
}
