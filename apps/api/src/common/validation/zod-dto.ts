import type { ZodType } from 'zod';
import { z } from 'zod';

/**
 * Zod şemasından hem çalışma zamanı doğrulaması hem OpenAPI şeması üreten DTO sınıfı.
 *
 * `nestjs-zod` kullanılmıyor: 5.x sürümünün peer'ları NestJS 12'yi desteklemiyor.
 * Zod 4'ün yerleşik `z.toJSONSchema()` API'si yeterli.
 */
export interface ZodDtoStatic<TOutput = unknown, TInput = TOutput> {
  new (): TOutput;
  zodSchema: ZodType<TOutput, TInput>;
  /** OpenAPI `components.schemas` altındaki ad. */
  schemaName: string;
  isZodDto: true;
}

export function createZodDto<TOutput, TInput>(
  schemaName: string,
  schema: ZodType<TOutput, TInput>,
): ZodDtoStatic<TOutput, TInput> {
  class Dto {
    static zodSchema = schema;
    static schemaName = schemaName;
    static isZodDto = true as const;
  }
  Object.defineProperty(Dto, 'name', { value: schemaName });
  return Dto as unknown as ZodDtoStatic<TOutput, TInput>;
}

export function isZodDto(value: unknown): value is ZodDtoStatic {
  return (
    typeof value === 'function' &&
    (value as { isZodDto?: boolean }).isZodDto === true &&
    'zodSchema' in value
  );
}

/** OpenAPI 3.1 uyumlu JSON Schema üretir (3.1 zaten draft 2020-12 tabanlı). */
export function toOpenApiSchema(schema: ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'output',
    unrepresentable: 'any',
  }) as Record<string, unknown>;

  // `$schema` tekil bir JSON Schema belgesine aittir; components.schemas
  // altındaki parçalarda anlamsız — çıkarıyoruz.
  const { $schema: _ignored, ...rest } = generated;
  return rest;
}
