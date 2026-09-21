import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import { AppConfig } from '../common/config/app-config.js';
import { getRootLogger } from '../common/logging/logger.js';
import { ALL_QUEUE_NAMES, type QueueName } from './queue.constants.js';
import { createRedis } from './redis.connection.js';

export const QUEUE_REDIS = Symbol('QUEUE_REDIS');
export const QUEUE_REGISTRY = Symbol('QUEUE_REGISTRY');

export type QueueRegistry = {
  get(name: QueueName): Queue;
  all(): Queue[];
};

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_REDIS,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Redis => createRedis(config.get('REDIS_URL')),
    },
    {
      provide: QUEUE_REGISTRY,
      inject: [QUEUE_REDIS, AppConfig],
      useFactory: (connection: Redis, config: AppConfig): QueueRegistry => {
        const prefix = config.get('QUEUE_PREFIX');
        const queues = new Map<QueueName, Queue>(
          ALL_QUEUE_NAMES.map((name) => [
            name,
            new Queue(name, {
              connection,
              prefix,
              defaultJobOptions: {
                // Üstel geri çekilme (BACKEND_SPEC §5.4); iş bazında ezilebilir.
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86_400 },
              },
            }),
          ]),
        );
        return {
          get: (name) => {
            const queue = queues.get(name);
            if (!queue) throw new Error(`Tanımsız kuyruk: ${name}`);
            return queue;
          },
          all: () => [...queues.values()],
        };
      },
    },
  ],
  exports: [QUEUE_REGISTRY, QUEUE_REDIS],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(
    @Inject(QUEUE_REGISTRY) private readonly registry: QueueRegistry,
    @Inject(QUEUE_REDIS) private readonly connection: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.registry.all().map((queue) => queue.close()));
    this.connection.disconnect();
    getRootLogger().debug('Kuyruk bağlantıları kapatıldı');
  }
}
