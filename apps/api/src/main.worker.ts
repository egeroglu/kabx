import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppConfig } from './common/config/app-config.js';
import { createRootLogger, getRootLogger, setRootLogger } from './common/logging/logger.js';
import { QueueName } from './queue/queue.constants.js';
import { maintenanceProcessor } from './queue/processors/maintenance.processor.js';
import { createRedis } from './queue/redis.connection.js';
import { WorkerRuntime } from './queue/worker.runtime.js';
import { WorkerModule } from './worker.module.js';

async function main(): Promise<void> {
  const config = AppConfig.fromProcessEnv();
  setRootLogger(createRootLogger(config.all));

  // Worker'ın da DI konteyneri var: işlemciler servisleri buradan çözecek.
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.enableShutdownHooks();

  // Worker'lar kuyruk üreticisinden AYRI bağlantı kullanır (BullMQ gereği).
  const connection = createRedis(config.get('REDIS_URL'));
  const runtime = new WorkerRuntime(
    connection,
    config.get('QUEUE_PREFIX'),
    config.get('WORKER_CONCURRENCY'),
  );

  runtime.register({ queue: QueueName.MAINTENANCE, process: maintenanceProcessor });

  getRootLogger().info({ queues: [QueueName.MAINTENANCE] }, 'Kabx worker ayakta');

  const shutdown = async (signal: string): Promise<void> => {
    getRootLogger().info({ signal }, 'worker kapatılıyor');
    await runtime.close();
    connection.disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  getRootLogger().fatal({ err: error }, 'Worker başlatılamadı');
  process.exit(1);
});
