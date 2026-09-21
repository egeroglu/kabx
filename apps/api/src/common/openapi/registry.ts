import type { ZodType } from 'zod';

import { toOpenApiSchema, type ZodDtoStatic } from '../validation/zod-dto.js';

/**
 * Zod şemalarını OpenAPI `components.schemas` altına taşıyan kayıt defteri.
 * Süreç başına tek örnek; dokümanı üretirken tek seferde boşaltılır.
 */
class OpenApiSchemaRegistry {
  private readonly schemas = new Map<string, ZodType>();

  register(name: string, schema: ZodType): string {
    const existing = this.schemas.get(name);
    if (existing && existing !== schema) {
      throw new Error(`OpenAPI şema adı çakışması: "${name}" zaten farklı bir şemayla kayıtlı.`);
    }
    this.schemas.set(name, schema);
    return refOf(name);
  }

  registerDto(dto: ZodDtoStatic): string {
    return this.register(dto.schemaName, dto.zodSchema);
  }

  build(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [name, schema] of this.schemas) {
      out[name] = toOpenApiSchema(schema);
    }
    return out;
  }

  clear(): void {
    this.schemas.clear();
  }
}

export const openApiRegistry = new OpenApiSchemaRegistry();

export function refOf(name: string): string {
  return `#/components/schemas/${name}`;
}
