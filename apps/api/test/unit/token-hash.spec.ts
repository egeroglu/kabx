import { describe, expect, it } from 'vitest';

import {
  generateOtpCode,
  generateRefreshToken,
  TokenHasher,
} from '../../src/modules/auth/token.hash.js';

describe('TokenHasher', () => {
  const hasher = new TokenHasher('a'.repeat(32));

  it('aynı girdi aynı özeti verir', () => {
    expect(hasher.hash('abc')).toBe(hasher.hash('abc'));
  });

  it('özet ham değeri içermez — DB sızsa bile token kullanılamaz', () => {
    const token = generateRefreshToken();
    expect(hasher.hash(token)).not.toContain(token);
    expect(hasher.hash(token)).toHaveLength(64);
  });

  it('farklı sır farklı özet üretir (pepper işe yarıyor)', () => {
    const other = new TokenHasher('b'.repeat(32));
    expect(hasher.hash('abc')).not.toBe(other.hash('abc'));
  });

  it('doğru değeri eşleştirir, yanlışı reddeder', () => {
    const hash = hasher.hash('gizli');
    expect(hasher.matches('gizli', hash)).toBe(true);
    expect(hasher.matches('gizli-degil', hash)).toBe(false);
  });

  it('bozuk özet girdisinde patlamaz', () => {
    expect(hasher.matches('x', 'hex-degil!!')).toBe(false);
    expect(hasher.matches('x', '')).toBe(false);
  });
});

describe('token üretimi', () => {
  it('refresh token yüksek entropili ve URL güvenli', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bayt base64url → 43 karakter
    expect(token).toHaveLength(43);
  });

  it('refresh token her çağrıda farklı', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateRefreshToken()));
    expect(tokens.size).toBe(200);
  });

  it('OTP her zaman 6 hane — baştaki sıfırlar korunur', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('OTP dağılımı tek bir değere saplanmıyor', () => {
    const codes = new Set(Array.from({ length: 300 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(250);
  });
});
