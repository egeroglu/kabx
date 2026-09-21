/**
 * Kuyruk adları tek yerde. Worker'lar ve üreticiler buradan okur.
 * Fazlar ilerledikçe bu liste büyüyecek (etiketleme, embedding, thumbnail,
 * abonelik senkronu, katalog importu, hesap silme, veri dışa aktarma...).
 */
export const QueueName = {
  /** Bakım işleri: temizlik cron'ları ve sağlık kontrolü ping'i. */
  MAINTENANCE: 'maintenance',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const ALL_QUEUE_NAMES = Object.values(QueueName);

export const JobName = {
  PING: 'ping',
} as const;

export type PingJobData = { at: string };
