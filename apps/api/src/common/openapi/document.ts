import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { openApiRegistry } from './registry.js';
import { errorResponseSchema, healthResponseSchema, pageInfoSchema } from './schemas.js';

export const OPENAPI_TITLE = 'Kabx API';
export const OPENAPI_VERSION = '1.0.0';

/** Her dokümanda bulunması gereken ortak şemalar. */
function registerSharedSchemas(): void {
  openApiRegistry.register('ErrorResponse', errorResponseSchema);
  openApiRegistry.register('PageInfo', pageInfoSchema);
  openApiRegistry.register('HealthResponse', healthResponseSchema);
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  registerSharedSchemas();

  const config = new DocumentBuilder()
    // 3.1: Zod'un ürettiği JSON Schema (draft 2020-12) ile uyumlu olan sürüm.
    .setOpenAPIVersion('3.1.0')
    .setTitle(OPENAPI_TITLE)
    .setDescription(
      [
        'Kabx dijital gardırop ve stil uygulaması API dokümanı.',
        '',
        'Hata cevapları her zaman `ErrorResponse` formatındadır; `error.code` mobil tarafta',
        'i18n anahtarı olarak kullanılır. Listeler cursor tabanlı sayfalama kullanır.',
      ].join('\n'),
    )
    .setVersion(OPENAPI_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Kısa ömürlü access token',
      },
      'bearer',
    )
    .addServer('/', 'Geçerli sunucu')
    .build();

  const document = SwaggerModule.createDocument(app, config, { deepScanRoutes: true });

  const components = (document.components ??= {});
  components.schemas = {
    ...(components.schemas ?? {}),
    ...(openApiRegistry.build() as NonNullable<OpenAPIObject['components']>['schemas']),
  };

  return document;
}

export function mountSwaggerUi(app: INestApplication, document: OpenAPIObject): void {
  SwaggerModule.setup('v1/docs', app, document, {
    jsonDocumentUrl: 'v1/docs/openapi.json',
    swaggerOptions: { persistAuthorization: true },
  });
}
