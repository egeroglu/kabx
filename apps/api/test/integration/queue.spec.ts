import { Queue, QueueEvents } from 'bullmq';
import { type Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';

import { JobName, QueueName } from '../../src/queue/queue.constants.js';
import { maintenanceProcessor } from '../../src/queue/processors/maintenance.processor.js';
import { createRedis } from '../../src/queue/redis.connection.js';
import { WorkerRuntime } from '../../src/queue/worker.runtime.js';

/**
 * Üretici → Redis → worker zincirinin uçtan uca çalıştığını doğrular.
 * Bu kablolama Faz 4'teki etiketleme/embedding işlerinin temeli.
 */
describe('kuyruk çalışma zamanı', () => {
  const prefix = `kabxtest-${Math.random().toString(36).slice(2, 8)}`;
  const connections: Redis[] = [];
  let queue: Queue;
  let events: QueueEvents;
  let runtime: WorkerRuntime;

  const newConnection = (): Redis => {
    const connection = createRedis(inject('redisUrl'));
    connections.push(connection);
    return connection;
  };

  beforeAll(async () => {
    // Üretici, worker ve olay dinleyicisi AYRI bağlantı kullanır: worker ve
    // QueueEvents blocking komutlarla meşgul olur, paylaşılan bağlantı kilitlenir.
    queue = new Queue(QueueName.MAINTENANCE, { connection: newConnection(), prefix });
    events = new QueueEvents(QueueName.MAINTENANCE, { connection: newConnection(), prefix });
    await events.waitUntilReady();

    runtime = new WorkerRuntime(newConnection(), prefix, 2);
    runtime.register({ queue: QueueName.MAINTENANCE, process: maintenanceProcessor });
  });

  afterAll(async () => {
    await runtime.close();
    await events.close();
    await queue.close();
    for (const connection of connections) connection.disconnect();
  });

  it('eklenen iş worker tarafından işlenir', async () => {
    const at = new Date().toISOString();
    const job = await queue.add(JobName.PING, { at });

    const result = (await job.waitUntilFinished(events, 20_000)) as { pong: boolean; at: string };

    expect(result.pong).toBe(true);
    expect(result.at).toBe(at);
  });

  it('bilinmeyen iş adı başarısız olur', async () => {
    const job = await queue.add('bilinmeyen-is', {}, { attempts: 1 });
    await expect(job.waitUntilFinished(events, 20_000)).rejects.toThrow(/Bilinmeyen iş adı/);
  });

  it('başarısız iş kuyruk sayaçlarına yansır', async () => {
    const counts = await queue.getJobCounts('failed');
    expect(counts.failed).toBeGreaterThanOrEqual(1);
  });
});
