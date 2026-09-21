import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';

import { DB } from '../db/db.module.js';
import type { Database } from '../db/client.js';
import { QUEUE_REGISTRY, type QueueRegistry } from '../queue/queue.module.js';

const READY_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} zaman aşımı (${ms}ms)`)), ms).unref(),
    ),
  ]);
}

@Injectable()
export class PostgresHealthIndicator {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'postgres'): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    const startedAt = Date.now();
    try {
      await withTimeout(this.db.execute(sql`select 1`), READY_TIMEOUT_MS, 'postgres');
      return indicator.up({ latencyMs: Date.now() - startedAt });
    } catch (error) {
      return indicator.down({ reason: (error as Error).message });
    }
  }
}

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject('HEALTH_REDIS') private readonly redis: Redis,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'redis'): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    const startedAt = Date.now();
    try {
      const pong = await withTimeout(this.redis.ping(), READY_TIMEOUT_MS, 'redis');
      if (pong !== 'PONG') throw new Error(`Beklenmeyen PING cevabı: ${String(pong)}`);
      return indicator.up({ latencyMs: Date.now() - startedAt });
    } catch (error) {
      return indicator.down({ reason: (error as Error).message });
    }
  }
}

@Injectable()
export class QueueHealthIndicator {
  constructor(
    @Inject(QUEUE_REGISTRY) private readonly registry: QueueRegistry,
    private readonly health: HealthIndicatorService,
  ) {}

  /** Kuyruk derinliğini de döner: metrik ve alarm için tek kaynak. */
  async check(key = 'queues'): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const entries = await withTimeout(
        Promise.all(
          this.registry.all().map(async (queue) => {
            const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed');
            return [queue.name, counts] as const;
          }),
        ),
        READY_TIMEOUT_MS,
        'queues',
      );
      return indicator.up(Object.fromEntries(entries));
    } catch (error) {
      return indicator.down({ reason: (error as Error).message });
    }
  }
}
