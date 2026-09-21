import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppException } from '../../src/common/errors/app.exception.js';
import { ErrorCode } from '../../src/common/errors/error-codes.js';
import { createZodDto, isZodDto, toOpenApiSchema } from '../../src/common/validation/zod-dto.js';
import { ZodValidationPipe } from '../../src/common/validation/zod-validation.pipe.js';

const SwipeDto = createZodDto(
  'SwipeInput',
  z.object({
    cardId: z.uuid(),
    direction: z.enum(['like', 'dislike']),
    dwellMs: z.coerce.number().int().min(0).optional(),
  }),
);

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();
  const meta = { type: 'body' as const, metatype: SwipeDto, data: undefined };

  it('geçerli gövdeyi ayrıştırıp dönüştürür', () => {
    const result = pipe.transform(
      { cardId: '01a0c413-e48a-7105-9f35-500ae46482cf', direction: 'like', dwellMs: '1200' },
      meta,
    );
    expect(result).toEqual({
      cardId: '01a0c413-e48a-7105-9f35-500ae46482cf',
      direction: 'like',
      dwellMs: 1200,
    });
  });

  it('geçersiz gövdede VALIDATION_FAILED ve alan yolu döner', () => {
    try {
      pipe.transform({ cardId: 'uuid-degil', direction: 'maybe' }, meta);
      expect.unreachable('doğrulama hata vermeliydi');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(exception.getStatus()).toBe(400);
      const issues = (exception.details as { issues: { path: string }[] }).issues;
      expect(issues.map((i) => i.path).sort()).toEqual(['cardId', 'direction']);
    }
  });

  it("Zod DTO olmayan metatype'a dokunmaz", () => {
    const value = { ham: 'veri' };
    expect(pipe.transform(value, { type: 'body', metatype: String, data: undefined })).toBe(value);
  });
});

describe('Zod → OpenAPI köprüsü', () => {
  it('DTO tanınır ve adı korunur', () => {
    expect(isZodDto(SwipeDto)).toBe(true);
    expect(isZodDto(class Other {})).toBe(false);
    expect(SwipeDto.schemaName).toBe('SwipeInput');
  });

  it('JSON Schema üretir — enum değerleri şemaya çıkar', () => {
    const schema = toOpenApiSchema(SwipeDto.zodSchema) as {
      type: string;
      properties: { direction: { enum: string[] } };
      required: string[];
    };
    expect(schema.type).toBe('object');
    expect(schema.properties.direction.enum).toEqual(['like', 'dislike']);
    expect(schema.required.sort()).toEqual(['cardId', 'direction']);
  });
});
