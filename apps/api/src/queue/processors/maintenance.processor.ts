import type { Job } from 'bullmq';

import { getRootLogger } from '../../common/logging/logger.js';
import { JobName, type PingJobData } from '../queue.constants.js';

/**
 * Bakım kuyruğu. Faz 0'da yalnızca `ping` var: API → Redis → worker zincirinin
 * uçtan uca çalıştığını hem entegrasyon testinde hem canlıda doğrular.
 * Sonraki fazlarda tamamlanmamış yüklemelerin temizliği (§5.2) buraya gelecek.
 */
export async function maintenanceProcessor(job: Job): Promise<unknown> {
  switch (job.name) {
    case JobName.PING: {
      const data = job.data as PingJobData;
      getRootLogger().debug({ jobId: job.id, at: data.at }, 'ping işlendi');
      return { pong: true, at: data.at, processedAt: new Date().toISOString() };
    }
    default:
      throw new Error(`Bilinmeyen iş adı: ${job.name}`);
  }
}
