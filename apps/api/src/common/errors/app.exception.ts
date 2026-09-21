import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from './error-codes.js';

export type ErrorDetails = Record<string, unknown>;

/**
 * Uygulama içindeki tüm bilinen hatalar bununla fırlatılır.
 * Cevap gövdesi GlobalExceptionFilter tarafından tek formata çevrilir.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super({ code, message, details }, status);
  }

  static badRequest(code: ErrorCode, message: string, details?: ErrorDetails) {
    return new AppException(code, HttpStatus.BAD_REQUEST, message, details);
  }

  static unauthorized(
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    message = 'Unauthorized',
    details?: ErrorDetails,
  ) {
    return new AppException(code, HttpStatus.UNAUTHORIZED, message, details);
  }

  static forbidden(
    code: ErrorCode = ErrorCode.FORBIDDEN,
    message = 'Forbidden',
    details?: ErrorDetails,
  ) {
    return new AppException(code, HttpStatus.FORBIDDEN, message, details);
  }

  /**
   * Başkasının kaynağına erişim de buraya düşer: yetkisizlik 403 değil 404 döner,
   * böylece kaynağın varlığı sızmaz (BACKEND_SPEC §6).
   */
  static notFound(code: ErrorCode, message: string, details?: ErrorDetails) {
    return new AppException(code, HttpStatus.NOT_FOUND, message, details);
  }

  static conflict(code: ErrorCode, message: string, details?: ErrorDetails) {
    return new AppException(code, HttpStatus.CONFLICT, message, details);
  }

  static unprocessable(code: ErrorCode, message: string, details?: ErrorDetails) {
    return new AppException(code, HttpStatus.UNPROCESSABLE_ENTITY, message, details);
  }

  static tooManyRequests(
    code: ErrorCode = ErrorCode.RATE_LIMITED,
    message = 'Rate limited',
    details?: ErrorDetails,
  ) {
    return new AppException(code, HttpStatus.TOO_MANY_REQUESTS, message, details);
  }

  static serviceUnavailable(code: ErrorCode, message: string, details?: ErrorDetails) {
    return new AppException(code, HttpStatus.SERVICE_UNAVAILABLE, message, details);
  }
}
