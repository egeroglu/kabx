import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiResponse } from '@nestjs/swagger';

import type { ErrorCode } from '../errors/error-codes.js';
import type { ZodDtoStatic } from '../validation/zod-dto.js';
import { openApiRegistry, refOf } from './registry.js';

/** Zod DTO'sunu istek gövdesi olarak belgeler. */
export function ApiZodBody(dto: ZodDtoStatic, description?: string) {
  const ref = openApiRegistry.registerDto(dto);
  return applyDecorators(ApiBody({ description, schema: { $ref: ref } }), ApiExtraModels());
}

/** Zod DTO'sunu başarılı cevap olarak belgeler. */
export function ApiZodResponse(
  status: number,
  dto: ZodDtoStatic,
  options?: { description?: string; isArray?: boolean },
) {
  const ref = openApiRegistry.registerDto(dto);
  return ApiResponse({
    status,
    description: options?.description,
    schema: options?.isArray ? { type: 'array', items: { $ref: ref } } : { $ref: ref },
  });
}

/**
 * Bir ucun dönebileceği hata kodlarını belgeler.
 * Gövde şeması her zaman ortak ErrorResponse'tur; burada yalnızca olası `code`
 * değerleri açıklamaya yazılır, böylece mobil hangi i18n anahtarlarını
 * karşılaması gerektiğini OpenAPI'den görebilir.
 */
export function ApiErrorResponse(status: number, codes: ErrorCode[], description?: string) {
  return ApiResponse({
    status,
    description: [description, `Olası kodlar: ${codes.join(', ')}`].filter(Boolean).join(' — '),
    schema: { $ref: refOf('ErrorResponse') },
  });
}
