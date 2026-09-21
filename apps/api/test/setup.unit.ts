import 'reflect-metadata';

// Birim testleri gerçek servise bağlanmaz; config doğrulamasının geçmesi için
// en düşük ortam yeterli.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.DATABASE_URL ??= 'postgres://kabx:kabx@localhost:55432/kabx_test';
process.env.REDIS_URL ??= 'redis://localhost:56379';
