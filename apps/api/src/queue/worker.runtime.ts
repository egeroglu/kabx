import { Worker, type Job, type Processor } from 'bullmq';
import type { Redis } from 'ioredis';

import { getRootLogger } from '../common/logging/logger.js';
import type { QueueName } from './queue.constants.js';

export type WorkerDefinition = {
  queue: QueueName;
  concurrency?: number;
  process: Processor;
};

/**
 * Worker süreci bu çalışma zamanını kullanır. API süreci worker BAŞLATMAZ —
 * ikisi ayrı süreçtir (BACKEND_SPEC §3.3), ama aynı kod tabanını paylaşır.
 */
export class WorkerRuntime {
  private readonly workers: Worker[] = [];

  constructor(
    private readonly connection: Redis,
    private readonly prefix: string,
    private readonly defaultConcurrency: number,
  ) {}

  register(definition: WorkerDefinition): Worker {
    const log = getRootLogger().child({ queue: definition.queue });

    const worker = new Worker(definition.queue, definition.process, {
      connection: this.connection,
      prefix: this.prefix,
      concurrency: definition.concurrency ?? this.defaultConcurrency,
    });

    worker.on('completed', (job: Job) => {
      log.debug({ jobId: job.id, name: job.name }, 'iş tamamlandı');
    });
    worker.on('failed', (job: Job | undefined, error: Error) => {
      log.error(
        { jobId: job?.id, name: job?.name, attempts: job?.attemptsMade, err: error },
        'iş başarısız',
      );
    });
    worker.on('error', (error: Error) => {
      log.error({ err: error }, 'worker hatası');
    });

    this.workers.push(worker);
    return worker;
  }

  /** İşlenmekte olan işler bitene kadar bekler; iş ortada kesilmez. */
  async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    getRootLogger().info({ count: this.workers.length }, "worker'lar kapatıldı");
  }
}
