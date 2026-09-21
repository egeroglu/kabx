import { describe, expect, it } from 'vitest';

import { AppException } from '../../src/common/errors/app.exception.js';
import { ErrorCode } from '../../src/common/errors/error-codes.js';
import { MockIdentityProvider } from '../../src/modules/auth/identity/mock.provider.js';
import {
  APPLE_OIDC,
  GOOGLE_OIDC,
  OidcIdentityProvider,
} from '../../src/modules/auth/identity/oidc.provider.js';

describe('MockIdentityProvider', () => {
  const apple = new MockIdentityProvider('apple');

  it('subject, e-posta ve adı ayrıştırır', async () => {
    await expect(apple.verify('mock:sub-1:ayse@example.com:Ayşe')).resolves.toEqual({
      provider: 'apple',
      subject: 'sub-1',
      email: 'ayse@example.com',
      emailVerified: true,
      displayName: 'Ayşe',
    });
  });

  it('yalnızca subject verildiğinde e-posta doğrulanmamış sayılır', async () => {
    const identity = await apple.verify('mock:sub-2');
    expect(identity.email).toBeNull();
    expect(identity.emailVerified).toBe(false);
  });

  it('mock biçiminde olmayan belirteci reddeder', async () => {
    await expect(apple.verify('gercek.jwt.gibi')).rejects.toThrow(AppException);
  });
});

describe('OidcIdentityProvider', () => {
  it('client ID yapılandırılmamışsa doğrulama YAPMAZ, açıkça reddeder', async () => {
    // aud kontrolü yapılamıyorsa "doğrulandı" demek, başka bir uygulama için
    // verilmiş geçerli bir token'ı kabul etmek olurdu.
    const provider = new OidcIdentityProvider({
      provider: 'google',
      jwksUri: GOOGLE_OIDC.jwksUri,
      issuers: [...GOOGLE_OIDC.issuers],
      audiences: [],
    });

    await expect(provider.verify('herhangi.bir.token')).rejects.toMatchObject({
      code: ErrorCode.IDENTITY_PROVIDER_REJECTED,
    });
  });

  it('Apple uç noktaları resmî dokümandaki değerler', () => {
    expect(APPLE_OIDC.jwksUri).toBe('https://appleid.apple.com/auth/keys');
    expect(APPLE_OIDC.issuers).toEqual(['https://appleid.apple.com']);
  });

  it('Google uç noktaları resmî dokümandaki değerler', () => {
    expect(GOOGLE_OIDC.jwksUri).toBe('https://www.googleapis.com/oauth2/v3/certs');
    // Google iki biçimi de kullanıyor; ikisi de kabul edilmeli.
    expect(GOOGLE_OIDC.issuers).toContain('https://accounts.google.com');
    expect(GOOGLE_OIDC.issuers).toContain('accounts.google.com');
  });

  it('geçersiz JWT imza doğrulamasında reddedilir', async () => {
    const provider = new OidcIdentityProvider({
      provider: 'apple',
      jwksUri: APPLE_OIDC.jwksUri,
      issuers: [...APPLE_OIDC.issuers],
      audiences: ['com.kabx.app'],
    });

    // Ağa çıkmadan önce biçim kontrolünde düşer.
    await expect(provider.verify('bu.bir.jwt-degil')).rejects.toMatchObject({
      code: ErrorCode.IDENTITY_PROVIDER_REJECTED,
    });
  });
});
