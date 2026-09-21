import type { FastifyInstance } from 'fastify';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { ApiModule } from '../api.module.js';
import { AppConfig } from '../common/config/app-config.js';
import { ErrorReporter } from '../common/errors/error-reporter.js';
import { GlobalExceptionFilter } from '../common/errors/global-exception.filter.js';
import { generateRequestId, REQUEST_ID_HEADER } from '../common/http/request-id.js';
import { createRootLogger, PinoNestLogger, setRootLogger } from '../common/logging/logger.js';
import { buildOpenApiDocument, mountSwaggerUi } from '../common/openapi/document.js';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';

export const API_PREFIX = 'v1';

export async function createApiApp(): Promise<NestFastifyApplication> {
  // Config ve logger'ı Nest ayağa kalkmadan önce kur; boot hataları da JSON loglansın.
  const config = AppConfig.fromProcessEnv();
  setRootLogger(createRootLogger(config.all));

  const adapter = new FastifyAdapter({
    genReqId: generateRequestId,
    bodyLimit: config.get('BODY_LIMIT_BYTES'),
    logger: false,
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(ApiModule, adapter, {
    bufferLogs: true,
  });

  app.useLogger(await app.resolve(PinoNestLogger));

  await registerFastifyPlugins(adapter, config);

  // Health uçları da /v1 altında: tek kural, istisna yok.
  app.setGlobalPrefix(API_PREFIX);
  // Tek doğrulama yolu Zod; class-validator kullanılmıyor.
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter(config, app.get(ErrorReporter)));

  const origins = config.corsOrigins;
  if (origins.length > 0) {
    app.enableCors({ origin: origins, credentials: true });
  }

  // SIGTERM/SIGINT geldiğinde onApplicationShutdown kancaları çalışsın.
  app.enableShutdownHooks();

  if (config.get('OPENAPI_ENABLED')) {
    mountSwaggerUi(app, buildOpenApiDocument(app));
  }

  return app;
}

async function registerFastifyPlugins(adapter: FastifyAdapter, config: AppConfig): Promise<void> {
  const fastify = adapter.getInstance<FastifyInstance>();

  const helmet = (await import('@fastify/helmet')).default;
  await fastify.register(helmet, {
    // Swagger UI inline script kullanıyor; CSP yalnızca production'da açık.
    contentSecurityPolicy: config.isProduction,
  });

  const rateLimit = (await import('@fastify/rate-limit')).default;
  await fastify.register(rateLimit, {
    global: false, // Asıl kurallar uç bazında (Faz 1: auth, Faz 8: son hali).
    max: 300,
    timeWindow: '1 minute',
  });

  // İstek kimliğini cevaba da yaz: mobilde bir hata görüldüğünde kullanıcıdan
  // gelen bu kimlikle sunucu logları doğrudan bulunabilsin.
  fastify.addHook('onSend', (request, reply, _payload, done) => {
    void reply.header(REQUEST_ID_HEADER, String(request.id));
    done();
  });
}
