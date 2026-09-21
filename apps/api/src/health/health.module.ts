import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { AppConfig } from '../common/config/app-config.js';
import { createRedis } from '../queue/redis.connection.js';
import { HealthController } from './health.controller.js';
import {
  PostgresHealthIndicator,
  QueueHealthIndicator,
  RedisHealthIndicator,
} from './indicators.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    PostgresHealthIndicator,
    RedisHealthIndicator,
    QueueHealthIndicator,
    {
      // Health kontrolü kendi bağlantısını kullanır: kuyruk bağlantısı blocking
      // komutlarla meşgulken PING'in sıraya girip zaman aşımına uğramaması için.
      provide: 'HEALTH_REDIS',
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        createRedis(config.get('REDIS_URL'), { lazyConnect: true }),
    },
  ],
})
export class HealthModule {}
