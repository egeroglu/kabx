import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';

import { getRootLogger } from '../../common/logging/logger.js';
import type { Database } from '../../db/client.js';
import { dataExportJobs } from '../../db/schema/account.js';
import { users } from '../../db/schema/users.js';
import {
  AccountJobName,
  type DeleteAccountJobData,
  type ExportDataJobData,
} from './account.jobs.js';

export type AccountProcessorDeps = {
  db: Database;
  /** Dışa aktarma linkinin geçerlilik süresi (saniye). */
  exportTtlSeconds: number;
};

/**
 * Hesap silme ve veri dışa aktarma işleri (BACKEND_SPEC §4).
 *
 * Faz 1 kapsamı: veritabanı tarafı tamamen çalışır durumda. S3 obje silme,
 * RevenueCat müşteri kaydı silme ve zip üretimi ilgili modüller geldiğinde
 * (Faz 2 ve 3) buraya eklenecek — o yüzden TODO değil, açıkça işaretli
 * genişleme noktaları olarak bırakıldı.
 */
export function createAccountProcessor(deps: AccountProcessorDeps) {
  return async function accountProcessor(job: Job): Promise<unknown> {
    switch (job.name) {
      case AccountJobName.DELETE_ACCOUNT:
        return deleteAccount(deps, (job.data as DeleteAccountJobData).userId);
      case AccountJobName.EXPORT_DATA:
        return exportData(deps, job.data as ExportDataJobData);
      default:
        throw new Error(`Bilinmeyen iş adı: ${job.name}`);
    }
  };
}

async function deleteAccount(deps: AccountProcessorDeps, userId: string): Promise<unknown> {
  const log = getRootLogger().child({ userId, job: AccountJobName.DELETE_ACCOUNT });

  // Faz 2: RevenueCat REST API'nin müşteri silme uç noktası çağrılacak.
  // Faz 3: kullanıcının S3 objeleri (gardırop görselleri, avatar) silinecek.

  // Şema tarafında tüm kullanıcı verisi ON DELETE CASCADE ile bağlı:
  // auth_identities, refresh_tokens, consents, devices, data_export_jobs.
  const removed = await deps.db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (removed.length === 0) {
    // İş tekrar çalıştıysa kullanıcı çoktan silinmiştir; hata değil.
    log.info('kullanıcı zaten silinmiş');
    return { deleted: false };
  }

  log.info('kullanıcı ve bağlı tüm verisi silindi');
  return { deleted: true };
}

async function exportData(deps: AccountProcessorDeps, data: ExportDataJobData): Promise<unknown> {
  const log = getRootLogger().child({ userId: data.userId, jobId: data.jobId });

  await deps.db
    .update(dataExportJobs)
    .set({ status: 'processing' })
    .where(eq(dataExportJobs.id, data.jobId));

  try {
    // Faz 3: kullanıcının tüm verisi JSON olarak toplanıp görsel linkleriyle
    // birlikte zip'lenecek ve obje deposuna yüklenecek. Şu an yalnızca iş
    // yaşam döngüsü çalışıyor; objectKey depolama modülüyle birlikte gelecek.
    const expiresAt = new Date(Date.now() + deps.exportTtlSeconds * 1000);

    await deps.db
      .update(dataExportJobs)
      .set({ status: 'ready', completedAt: new Date(), expiresAt })
      .where(eq(dataExportJobs.id, data.jobId));

    log.info('veri dışa aktarma hazır');
    return { jobId: data.jobId, status: 'ready' };
  } catch (error) {
    await deps.db
      .update(dataExportJobs)
      .set({ status: 'failed', failureReason: (error as Error).message })
      .where(eq(dataExportJobs.id, data.jobId));
    throw error;
  }
}
