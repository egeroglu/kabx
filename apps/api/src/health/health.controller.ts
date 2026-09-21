import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';

import { ApiErrorResponse } from '../common/openapi/decorators.js';
import { refOf } from '../common/openapi/registry.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { ApiResponse } from '@nestjs/swagger';
import {
  PostgresHealthIndicator,
  QueueHealthIndicator,
  RedisHealthIndicator,
} from './indicators.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly queues: QueueHealthIndicator,
  ) {}

  /**
   * Liveness: süreç ayakta mı? Bağımlılıklara BAKMAZ — aksi halde geçici bir
   * Postgres kesintisi orchestrator'ın sağlıklı pod'ları öldürmesine yol açar.
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Süreç ayakta mı? Bağımlılık kontrol etmez.',
  })
  @ApiResponse({ status: 200, schema: { $ref: refOf('HealthResponse') } })
  live(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  /** Readiness: trafik alabilir mi? Postgres, Redis ve kuyruklar kontrol edilir. */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe', description: 'Postgres, Redis ve kuyruk erişimi.' })
  @ApiResponse({ status: 200, schema: { $ref: refOf('HealthResponse') } })
  @ApiErrorResponse(503, [ErrorCode.SERVICE_UNAVAILABLE], 'Bağımlılıklardan biri erişilemiyor')
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.postgres.check(),
      () => this.redis.check(),
      () => this.queues.check(),
    ]);
  }
}
