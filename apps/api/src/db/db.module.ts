import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';

import { AppConfig } from '../common/config/app-config.js';
import { getRootLogger } from '../common/logging/logger.js';
import { createDbHandle, type Database, type DbHandle } from './client.js';

export const DB_HANDLE = Symbol('DB_HANDLE');
export const DB = Symbol('DB');

@Global()
@Module({
  providers: [
    {
      provide: DB_HANDLE,
      inject: [AppConfig],
      useFactory: (config: AppConfig): DbHandle => createDbHandle(config),
    },
    {
      provide: DB,
      inject: [DB_HANDLE],
      useFactory: (handle: DbHandle): Database => handle.db,
    },
  ],
  exports: [DB, DB_HANDLE],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DB_HANDLE) private readonly handle: DbHandle) {}

  /** Graceful shutdown: açık bağlantılar kapanmadan süreç sonlanmasın. */
  async onApplicationShutdown(): Promise<void> {
    await this.handle.close();
    getRootLogger().debug('Postgres bağlantı havuzu kapatıldı');
  }
}
