import { Queue, QueueEvents } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';

import { createDbHandleFromUrl, type DbHandle } from '../../src/db/client.js';
import { consents, dataExportJobs, devices } from '../../src/db/schema/account.js';
import { refreshTokens } from '../../src/db/schema/auth.js';
import { authIdentities, users } from '../../src/db/schema/users.js';
import { AccountJobName } from '../../src/queue/processors/account.jobs.js';
import { createAccountProcessor } from '../../src/queue/processors/account.processor.js';
import { QueueName } from '../../src/queue/queue.constants.js';
import { createRedis } from '../../src/queue/redis.connection.js';
import { WorkerRuntime } from '../../src/queue/worker.runtime.js';

/**
 * Hesap silme ve dışa aktarma işleri worker'da çalışır; API yalnızca 202 döner.
 * Burada işin KENDİSİNİ sürüp gerçekten sildiğini doğruluyoruz.
 */
describe('hesap kuyruğu işleri', () => {
  const prefix = `kabxtest-${Math.random().toString(36).slice(2, 8)}`;
  const connections: Redis[] = [];
  let handle: DbHandle;
  let queue: Queue;
  let events: QueueEvents;
  let runtime: WorkerRuntime;

  const newConnection = (): Redis => {
    const connection = createRedis(inject('redisUrl'));
    connections.push(connection);
    return connection;
  };

  beforeAll(async () => {
    handle = createDbHandleFromUrl(inject('databaseUrl'), { max: 3 });
    queue = new Queue(QueueName.ACCOUNT, { connection: newConnection(), prefix });
    events = new QueueEvents(QueueName.ACCOUNT, { connection: newConnection(), prefix });
    await events.waitUntilReady();

    runtime = new WorkerRuntime(newConnection(), prefix, 2);
    runtime.register({
      queue: QueueName.ACCOUNT,
      process: createAccountProcessor({ db: handle.db, exportTtlSeconds: 86_400 }),
    });
  });

  afterAll(async () => {
    await runtime.close();
    await events.close();
    await queue.close();
    for (const connection of connections) connection.disconnect();
    await handle.close();
  });

  async function createUserWithData(): Promise<string> {
    const [user] = await handle.db
      .insert(users)
      .values({ email: `worker-${Math.random().toString(36).slice(2, 10)}@example.com` })
      .returning({ id: users.id });
    const userId = user!.id;

    await handle.db.insert(authIdentities).values({
      userId,
      provider: 'apple',
      subject: `worker-subject-${userId}`,
    });
    await handle.db.insert(refreshTokens).values({
      userId,
      familyId: userId,
      tokenHash: `hash-${userId}`,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await handle.db.insert(devices).values({
      userId,
      pushToken: `token-${userId}`,
      platform: 'ios',
      lastSeenAt: new Date(),
    });
    await handle.db.insert(consents).values({
      userId,
      kind: 'terms',
      version: '2026-09-01',
      locale: 'tr',
      acceptedAt: new Date(),
    });

    return userId;
  }

  it('hesap silme işi kullanıcıyı ve BAĞLI TÜM verisini siler', async () => {
    const userId = await createUserWithData();

    const job = await queue.add(AccountJobName.DELETE_ACCOUNT, { userId });
    const result = (await job.waitUntilFinished(events, 30_000)) as { deleted: boolean };
    expect(result.deleted).toBe(true);

    // Kaskad kuralları gerçekten çalışıyor mu — artık hiçbir yerde iz kalmamalı.
    for (const [label, rows] of [
      ['users', await handle.db.select().from(users).where(eq(users.id, userId))],
      [
        'auth_identities',
        await handle.db.select().from(authIdentities).where(eq(authIdentities.userId, userId)),
      ],
      [
        'refresh_tokens',
        await handle.db.select().from(refreshTokens).where(eq(refreshTokens.userId, userId)),
      ],
      ['devices', await handle.db.select().from(devices).where(eq(devices.userId, userId))],
      ['consents', await handle.db.select().from(consents).where(eq(consents.userId, userId))],
    ] as const) {
      expect(rows, `${label} tablosunda kalıntı var`).toHaveLength(0);
    }
  });

  it('silme işi tekrar çalışırsa hata vermez (idempotent)', async () => {
    const userId = await createUserWithData();

    const first = await queue.add(AccountJobName.DELETE_ACCOUNT, { userId });
    await first.waitUntilFinished(events, 30_000);

    const second = await queue.add(AccountJobName.DELETE_ACCOUNT, { userId });
    const result = (await second.waitUntilFinished(events, 30_000)) as { deleted: boolean };
    expect(result.deleted).toBe(false);
  });

  it('dışa aktarma işi `ready` durumuna geçer ve süre sonu yazılır', async () => {
    const userId = await createUserWithData();
    const [created] = await handle.db
      .insert(dataExportJobs)
      .values({ userId, status: 'pending' })
      .returning({ id: dataExportJobs.id });

    const job = await queue.add(AccountJobName.EXPORT_DATA, { userId, jobId: created!.id });
    await job.waitUntilFinished(events, 30_000);

    const [row] = await handle.db
      .select()
      .from(dataExportJobs)
      .where(eq(dataExportJobs.id, created!.id));

    expect(row?.status).toBe('ready');
    expect(row?.completedAt).not.toBeNull();
    expect(row?.expiresAt).not.toBeNull();
  });

  it('bilinmeyen iş adı başarısız olur', async () => {
    const job = await queue.add('bilinmeyen-hesap-isi', {}, { attempts: 1 });
    await expect(job.waitUntilFinished(events, 30_000)).rejects.toThrow(/Bilinmeyen iş adı/);
  });
});
