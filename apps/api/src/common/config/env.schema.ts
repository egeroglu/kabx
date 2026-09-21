import { z } from 'zod';

/**
 * Tüm ortam değişkenleri burada tanımlanır ve süreç açılışında doğrulanır.
 * Kodun hiçbir yerinde `process.env` okunmaz; her şey AppConfig üzerinden gelir.
 *
 * Kural (BACKEND_SPEC §2): dış servis anahtarları ve MODEL ADLARI koda yazılmaz.
 */

const bool = (def: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .default(def)
    .transform((v) =>
      typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()),
    );

const int = (def: number) => z.coerce.number().int().default(def);

/** Dış servis modları: `mock` yerel geliştirme ve testler için anahtarsız çalışır. */
const providerMode = z.enum(['mock', 'live']).default('mock');

export const envSchema = z.object({
  // --- Çalışma ortamı ---
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: int(3000),
  API_HOST: z.string().default('0.0.0.0'),
  /** Mobil istemcinin gördüğü taban URL (affiliate yönlendirme, e-posta linkleri). */
  PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default(''),
  BODY_LIMIT_BYTES: int(1_048_576),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: bool(false),
  /** Dev'de /v1/docs açılır; production'da kapalı olmalı. */
  OPENAPI_ENABLED: bool(true),
  DEFAULT_TIMEZONE: z.string().default('Europe/Istanbul'),

  // --- Veritabanı ---
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: int(10),
  DATABASE_SSL: bool(false),

  // --- Redis (cache + kuyruk + rate limit) ---
  REDIS_URL: z.string().url(),
  /** BullMQ anahtarlarının öneki; aynı Redis'i paylaşan ortamları ayırır. */
  QUEUE_PREFIX: z.string().default('kabx'),
  WORKER_CONCURRENCY: int(5),

  // --- Kimlik doğrulama / oturum (Faz 1) ---
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-only-access-secret-change-me-32+chars'),
  JWT_ACCESS_TTL_SECONDS: int(900), // 15 dk
  REFRESH_TOKEN_TTL_DAYS: int(60),
  JWT_ISSUER: z.string().default('kabx'),
  JWT_AUDIENCE: z.string().default('kabx-mobile'),
  APPLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_ID_IOS: z.string().default(''),
  GOOGLE_CLIENT_ID_ANDROID: z.string().default(''),
  OTP_TTL_SECONDS: int(600),
  OTP_MAX_ATTEMPTS: int(5),

  // --- E-posta (Resend) ---
  EMAIL_PROVIDER: providerMode,
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('Kabx <no-reply@kabx.app>'),

  // --- Obje depolama (S3 uyumlu: R2 / yerelde MinIO) ---
  STORAGE_PROVIDER: providerMode,
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('kabx-media'),
  S3_ACCESS_KEY_ID: z.string().default('kabxminio'),
  S3_SECRET_ACCESS_KEY: z.string().default('kabxminio'),
  S3_FORCE_PATH_STYLE: bool(true),
  /** Görsellerin sunulduğu CDN kökü (R2 public bucket ya da Cloudflare domaini). */
  CDN_BASE_URL: z.string().url().default('http://localhost:9000/kabx-media'),
  UPLOAD_URL_TTL_SECONDS: int(900),
  UPLOAD_MAX_BYTES: int(10_485_760), // 10 MB

  // --- Yapay zekâ (Gemini) — model adları env'den, kodda sabit değil ---
  AI_PROVIDER: providerMode,
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_TAGGING_MODEL: z.string().default('gemini-flash-lite-latest'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),
  EMBEDDING_DIM: int(768),
  AI_DAILY_JOB_QUOTA_PER_USER: int(100),
  AI_MAX_ATTEMPTS: int(3),

  // --- Abonelik (RevenueCat) ---
  SUBSCRIPTIONS_PROVIDER: providerMode,
  REVENUECAT_API_KEY: z.string().default(''),
  REVENUECAT_WEBHOOK_AUTH: z.string().default(''),
  REVENUECAT_WEBHOOK_SIGNING_SECRET: z.string().default(''),
  REVENUECAT_ENTITLEMENT: z.string().default('premium'),

  // --- Hava durumu ---
  WEATHER_PROVIDER: providerMode,
  WEATHER_API_KEY: z.string().default(''),
  WEATHER_API_BASE_URL: z.string().default('https://api.open-meteo.com/v1'),
  WEATHER_CACHE_TTL_SECONDS: int(3600),

  // --- Push bildirimi (Expo Push) ---
  PUSH_PROVIDER: providerMode,
  EXPO_ACCESS_TOKEN: z.string().default(''),

  // --- Gözlemlenebilirlik ---
  SENTRY_DSN: z.string().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  METRICS_ENABLED: bool(true),
});

export type Env = z.infer<typeof envSchema>;
