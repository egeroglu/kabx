import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppConfig } from './common/config/app-config.js';
import { createRootLogger, getRootLogger, setRootLogger } from './common/logging/logger.js';
import type { Database } from './db/client.js';
import { DB } from './db/db.module.js';
import { QueueName } from './queue/queue.constants.js';
import { createAccountProcessor } from './queue/processors/account.processor.js';
import { maintenanceProcessor } from './queue/processors/maintenance.processor.js';
import { createRedis } from './queue/redis.connection.js';
import { WorkerRuntime } from './queue/worker.runtime.js';
import { WorkerModule } from './worker.module.js';

async function main(): Promise<void> {
  const config = AppConfig.fromProcessEnv();
  setRootLogger(createRootLogger(config.all));

  // Worker'ın da DI konteyneri var: işlemciler servisleri buradan çözer.
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
  runtime.register({
    queue: QueueName.ACCOUNT,
    process: createAccountProcessor({
      db: app.get<Database>(DB),
      exportTtlSeconds: config.get('DATA_EXPORT_TTL_SECONDS'),
    }),
    // Hesap silme ve dışa aktarma ağır ve nadir işler; düşük eşzamanlılık yeter.
    concurrency: 2,
  });

  getRootLogger().info(
    { queues: [QueueName.MAINTENANCE, QueueName.ACCOUNT] },
    'Kabx worker ayakta',
  );

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
