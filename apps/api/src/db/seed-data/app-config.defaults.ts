import type { NewAppConfigRow } from '../schema/app-config.js';

/**
 * Remote config varsayılanları (BACKEND_SPEC §5.12).
 *
 * `premium.locked_features` BİLEREK boş: onaylanan karara göre deneme bitince
 * ücretsiz kullanıcıya her şey açık kalır; kısıtlama kod değişmeden buradan
 * (ya da Faz 2'deki admin API'sinden) verilecek.
 */
export const APP_CONFIG_DEFAULTS: NewAppConfigRow[] = [
  {
    key: 'premium.locked_features',
    value: [],
    description: 'Premium gerektiren özellik anahtarları. Boş = her şey ücretsiz kullanıcıya açık.',
    isPublic: true,
  },
  {
    key: 'app.min_supported_version',
    value: { ios: '1.0.0', android: '1.0.0' },
    description: 'Bu sürümün altındaki istemciler zorunlu güncellemeye yönlendirilir.',
    isPublic: true,
  },
  {
    key: 'discovery.exploration_ratio',
    value: 0.3,
    description: 'Keşfet akışında zevk vektöründen uzak içeriğin oranı (§5.8).',
    isPublic: false,
  },
  {
    key: 'outfits.score_weights',
    value: { formality: 0.45, color: 0.25, weather: 0.2, taste: 0.1 },
    description: 'Akıllı sıralama skorunun ağırlıkları (§5.5). Toplamı 1 olmalı.',
    isPublic: false,
  },
  {
    key: 'cleanup.unworn_days',
    value: 180,
    description: 'Temizlik kuyruğuna girmek için son giyilmeden geçmesi gereken gün (§5.11).',
    isPublic: false,
  },
  {
    key: 'cleanup.keep_snooze_days',
    value: 90,
    description: 'Tut denen parcanin tekrar sorulmayacagi gun sayisi (§5.11).',
    isPublic: false,
  },
  {
    key: 'wishlist.review_after_days',
    value: 14,
    description: 'Wishlist swipe kuyruğuna girme eşiği (§5.10).',
    isPublic: false,
  },
  {
    key: 'similarity.duplicate_threshold',
    value: 0.88,
    description: 'Benzeri var uyarısı için kosinüs benzerliği eşiği (§5.3).',
    isPublic: false,
  },
  {
    key: 'ai.daily_job_quota_per_user',
    value: 100,
    description: 'Kullanıcı başına günlük yapay zekâ iş kotası (§5.4).',
    isPublic: false,
  },
  {
    key: 'today.notification_hour',
    value: 8,
    description: 'Sabah bildiriminin kullanıcı yerel saatindeki varsayılan saati (§5.6).',
    isPublic: true,
  },
];
