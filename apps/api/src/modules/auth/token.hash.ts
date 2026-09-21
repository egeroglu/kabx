import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Refresh token'lar ve OTP kodları veritabanına HMAC'lenerek yazılır.
 *
 * Neden HMAC, neden düz SHA-256 değil: 6 haneli OTP kodu yalnızca bir milyon
 * olasılık demek. Veritabanı sızarsa düz özetler gökkuşağı tablosuyla anında
 * çözülür. Sunucu tarafındaki gizli anahtar (pepper) bunu imkânsız kılar —
 * saldırganın ayrıca uygulama sırrını da ele geçirmesi gerekir.
 *
 * Neden bcrypt/argon2 değil: refresh token'lar yüksek entropili rastgele
 * değerler; yavaş özet gereksiz maliyet. OTP'yi ise deneme sayacı ve kısa
 * ömür koruyor.
 */
export class TokenHasher {
  constructor(private readonly secret: string) {}

  hash(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  /** Sabit zamanlı karşılaştırma: özet uzunluğu bilgisi bile sızmasın. */
  matches(value: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(value), 'hex');
    let expected: Buffer;
    try {
      expected = Buffer.from(expectedHash, 'hex');
    } catch {
      return false;
    }
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  }
}

/** Tahmin edilemez refresh token; URL güvenli, 256 bit entropi. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * 6 haneli OTP. `randomInt` kriptografik olarak güvenli ve modulo sapması yok
 * (`Math.random` ya da `% 1000000` kullanılmıyor).
 */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
