import { describe, expect, it } from 'vitest';

import { maskEmail, maskUrl, REDACT_PATHS } from '../../src/common/logging/redaction.js';

describe('log maskeleme (BACKEND_SPEC §6)', () => {
  it('presigned URL imzasını gizler', () => {
    const url =
      'https://cdn.kabx.app/media/a.webp?X-Amz-Signature=deadbeefcafe&X-Amz-Credential=AKIA123&x=1';
    const masked = maskUrl(url);
    expect(masked).not.toContain('deadbeefcafe');
    expect(masked).not.toContain('AKIA123');
    expect(masked).toContain('x=1');
  });

  it('imzasız URL olduğu gibi kalır', () => {
    const url = 'https://cdn.kabx.app/media/a.webp';
    expect(maskUrl(url)).toBe(url);
  });

  it('URL olmayan girdide patlamaz', () => {
    expect(maskUrl('bu bir url degil')).toBe('bu bir url degil');
  });

  it('e-posta yerel kısmını maskeler, alan adını bırakır', () => {
    expect(maskEmail('ayse@example.com')).toBe('a***@example.com');
    expect(maskEmail('bozuk-adres')).toBe('[REDACTED]');
  });

  it('token ve yetkilendirme başlıkları maskeleme listesinde', () => {
    for (const path of [
      'req.headers.authorization',
      '*.accessToken',
      '*.refreshToken',
      '*.apiKey',
      '*.otp',
    ]) {
      expect(REDACT_PATHS).toContain(path);
    }
  });
});
