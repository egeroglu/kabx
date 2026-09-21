import { Redis, type RedisOptions } from 'ioredis';

/**
 * BullMQ'nun bağlantı gereksinimleri (BullMQ dokümanı):
 * - `maxRetriesPerRequest` null olmalı, aksi halde blocking komutlar hata verir.
 * - Kuyruk üreticisi ve worker AYRI bağlantı kullanmalı; worker bağlantısı
 *   blocking komutlarla meşgul olduğu için paylaşılırsa üretici kilitlenir.
 */
export function redisOptionsFor(url: string): { url: string; options: RedisOptions } {
  return {
    url,
    options: {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    },
  };
}

export function createRedis(url: string, overrides: RedisOptions = {}): Redis {
  const { options } = redisOptionsFor(url);
  return new Redis(url, { ...options, ...overrides });
}
