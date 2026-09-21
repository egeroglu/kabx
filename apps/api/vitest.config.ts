import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS'in DI'ı `emitDecoratorMetadata` ile üretilen tip bilgisine dayanır.
 * Vitest'in varsayılan dönüştürücüsü esbuild bunu DESTEKLEMEZ — bu yüzden
 * SWC eklentisi zorunlu (aynı sebeple dev script'leri de SWC kullanıyor).
 *
 * İki proje:
 *  - `unit`        : container gerektirmez, saniyeler içinde çalışır (`npm test`).
 *  - `integration` : Testcontainers ile gerçek Postgres+pgvector ve Redis ayağa
 *                    kaldırır (`npm run test:int`). Docker gerektirir.
 */
const swcPlugin = swc.vite({ module: { type: 'es6' } });

export default defineConfig({
  test: {
    globals: false,
    projects: [
      {
        plugins: [swcPlugin],
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.spec.ts', 'test/unit/**/*.spec.ts'],
          setupFiles: ['./test/setup.unit.ts'],
        },
      },
      {
        plugins: [swcPlugin],
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.spec.ts'],
          globalSetup: ['./test/setup.integration.ts'],
          // Container'ların ayağa kalkması yavaş; varsayılan 5 sn yetmez.
          testTimeout: 60_000,
          hookTimeout: 180_000,
          // Container'lar paylaşıldığı için test dosyaları sırayla çalışır.
          fileParallelism: false,
        },
      },
    ],
  },
});
