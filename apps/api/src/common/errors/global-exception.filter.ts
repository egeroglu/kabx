import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { AppConfig } from '../config/app-config.js';
import { getRootLogger } from '../logging/logger.js';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';
import { errorResponse, type ErrorResponse } from './error-response.js';
import { ErrorReporter } from './error-reporter.js';
import { zodIssuesToDetails } from '../validation/zod-issues.js';

/** 5xx sınırı — HttpStatus enum'u ile sayısal karşılaştırma yapmamak için. */
const SERVER_ERROR_THRESHOLD = 500;

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly config: AppConfig,
    private readonly reporter: ErrorReporter,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const { status, body, isUnexpected } = this.translate(exception);

    const log = getRootLogger().child({
      requestId: request?.id,
      method: request?.method,
      route: request?.routeOptions?.url ?? request?.url,
      status,
      code: body.error.code,
    });

    if (isUnexpected) {
      log.error({ err: exception }, 'beklenmeyen hata');
      this.reporter.capture(exception, {
        requestId: String(request?.id ?? ''),
        route: request?.routeOptions?.url ?? request?.url,
      });
    } else if (status >= SERVER_ERROR_THRESHOLD) {
      log.error({ err: exception }, 'sunucu hatası');
    } else {
      log.debug('istemci hatası');
    }

    void reply.status(status).send(body);
  }

  private translate(exception: unknown): {
    status: number;
    body: ErrorResponse;
    isUnexpected: boolean;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        body: errorResponse(exception.code, exception.message, exception.details),
        isUnexpected: false,
      };
    }

    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: errorResponse(ErrorCode.VALIDATION_FAILED, 'Request validation failed', {
          issues: zodIssuesToDetails(exception),
        }),
        isUnexpected: false,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      return {
        status,
        body: errorResponse(
          mapHttpStatusToCode(status),
          extractMessage(payload, exception.message),
        ),
        isUnexpected: false,
      };
    }

    // Bilinmeyen hata: detay ASLA istemciye sızmaz.
    const message = this.config.isProduction
      ? 'Internal server error'
      : exception instanceof Error
        ? exception.message
        : String(exception);

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: errorResponse(ErrorCode.INTERNAL_ERROR, message),
      isUnexpected: true,
    };
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = payload.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

function mapHttpStatusToCode(status: HttpStatus): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_FAILED;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.METHOD_NOT_ALLOWED:
      return ErrorCode.METHOD_NOT_ALLOWED;
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ErrorCode.PAYLOAD_TOO_LARGE;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      // Burada `status` HttpStatus tipinde; sayısal sabit yerine enum ile karşılaştır.
      return status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? ErrorCode.INTERNAL_ERROR
        : ErrorCode.VALIDATION_FAILED;
  }
}
