import { Module } from '@nestjs/common';

import { CoreModule } from './core.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';

/**
 * API sürecinin kök modülü. Domain modülleri (wardrobe, outfits, discovery...)
 * fazlar ilerledikçe buraya eklenecek.
 */
@Module({
  imports: [CoreModule, HealthModule, AuthModule, UsersModule],
})
export class ApiModule {}
