import { Module } from '@nestjs/common';

import { CommonModule } from './common/common.module.js';
import { AppConfigModule } from './common/config/config.module.js';
import { DbModule } from './db/db.module.js';
import { QueueModule } from './queue/queue.module.js';

/**
 * API ve worker süreçlerinin PAYLAŞTIĞI çekirdek: config, logging, hata takibi,
 * veritabanı ve kuyruk bağlantıları. Controller içermez.
 */
@Module({
  imports: [AppConfigModule, CommonModule, DbModule, QueueModule],
  exports: [AppConfigModule, CommonModule, DbModule, QueueModule],
})
export class CoreModule {}
