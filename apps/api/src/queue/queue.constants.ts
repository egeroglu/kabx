import type { Queue } from 'bullmq';

/**
 * Kuyruk adları tek yerde. Worker'lar ve üreticiler buradan okur.
 * Fazlar ilerledikçe bu liste büyüyecek (etiketleme, embedding, thumbnail,
 * abonelik senkronu, katalog importu).
 */
export const QueueName = {
  /** Bakım işleri: temizlik cron'ları ve sağlık kontrolü ping'i. */
  MAINTENANCE: 'maintenance',
  /** Hesap silme ve KVKK veri dışa aktarma (BACKEND_SPEC §4). */
  ACCOUNT: 'account',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const ALL_QUEUE_NAMES: QueueName[] = Object.values(QueueName);

export const JobName = {
  PING: 'ping',
  /** Süresi geçmiş refresh token ve OTP kayıtlarını siler. */
  PRUNE_AUTH_ARTIFACTS: 'prune_auth_artifacts',
} as const;

export type PingJobData = { at: string };

export type QueueRegistry = {
  get(name: QueueName): Queue;
  all(): Queue[];
};
