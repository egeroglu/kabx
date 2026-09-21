import type { ErrorCode } from './error-codes.js';

/**
 * API'nin TEK hata cevabı formatı (BACKEND_SPEC §3.6).
 * Mobil `error.code` alanını i18n anahtarı olarak kullanır.
 */
export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse {
  return { error: details ? { code, message, details } : { code, message } };
}
