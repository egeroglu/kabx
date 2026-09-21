import { Module } from '@nestjs/common';

import { CoreModule } from './core.module.js';
import { HealthModule } from './health/health.module.js';

/**
 * API sürecinin kök modülü. Domain modülleri (auth, wardrobe, outfits...)
 * fazlar ilerledikçe buraya eklenecek.
 */
@Module({
  imports: [CoreModule, HealthModule],
})
export class ApiModule {}
