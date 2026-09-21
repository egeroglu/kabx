import { Module } from '@nestjs/common';

import { CoreModule } from './core.module.js';
import { EmailModule } from './modules/email/email.module.js';

/**
 * Worker sürecinin kök modülü. Controller yok; işlemciler
 * `main.worker.ts` içinde WorkerRuntime'a kaydedilir.
 */
@Module({
  imports: [CoreModule, EmailModule],
})
export class WorkerModule {}
