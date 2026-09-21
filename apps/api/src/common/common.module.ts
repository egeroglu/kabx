import { Global, Module } from '@nestjs/common';

import { AppConfig } from './config/app-config.js';
import { createErrorReporter, ErrorReporter } from './errors/error-reporter.js';
import { PinoNestLogger } from './logging/logger.js';

@Global()
@Module({
  providers: [
    PinoNestLogger,
    {
      provide: ErrorReporter,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => createErrorReporter(config),
    },
  ],
  exports: [ErrorReporter, PinoNestLogger],
})
export class CommonModule {}
