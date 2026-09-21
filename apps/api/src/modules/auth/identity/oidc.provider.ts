import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose';

import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { IdentityProvider, type VerifiedIdentity } from './identity-provider.js';

export type OidcProviderConfig = {
  provider: 'apple' | 'google';
  jwksUri: string;
  /** Kabul edilen `iss` değerleri. Google ikisini de kullanıyor. */
  issuers: string[];
  /** Kabul edilen `aud` değerleri: uygulamanın client ID'leri. */
  audiences: string[];
};

/**
 * Apple ve Google ID token doğrulaması (BACKEND_SPEC §4).
 *
 * Her iki sağlayıcı da standart OIDC: JWKS'ten alınan açık anahtarla imza,
 * ardından `iss`, `aud` ve `exp` kontrolü. `jose`'nin `createRemoteJWKSet`'i
 * anahtarları önbellekler ve bilinmeyen bir `kid` görünce (anahtar rotasyonu)
 * kendiliğinden yeniden çeker.
 *
 * Kritik nokta: `aud` MUTLAKA bizim client ID'lerimizle karşılaştırılmalı.
 * Aksi halde saldırgan başka bir uygulama için verilmiş geçerli bir Google
 * token'ıyla bizim hesaplarımıza girebilir.
 */
export class OidcIdentityProvider extends IdentityProvider {
  readonly provider: 'apple' | 'google';
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: OidcProviderConfig) {
    super();
    this.provider = config.provider;
    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }

  async verify(idToken: string): Promise<VerifiedIdentity> {
    if (this.config.audiences.length === 0) {
      // Yapılandırılmamış sağlayıcıyla "doğrulama" yapmak, aud kontrolünü
      // atlamak demek olurdu. Sessizce geçmek yerine açıkça reddet.
      throw AppException.serviceUnavailable(
        ErrorCode.IDENTITY_PROVIDER_REJECTED,
        `${this.provider} için client ID yapılandırılmamış`,
      );
    }

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.config.issuers,
        audience: this.config.audiences,
        // Saat kayması toleransı: cihaz saati birkaç saniye ileri olabilir.
        clockTolerance: 60,
      }));
    } catch (error) {
      throw AppException.unauthorized(
        ErrorCode.IDENTITY_PROVIDER_REJECTED,
        `${this.provider} kimlik belirteci doğrulanamadı: ${(error as Error).message}`,
      );
    }

    const subject = payload.sub;
    if (!subject) {
      throw AppException.unauthorized(
        ErrorCode.IDENTITY_PROVIDER_REJECTED,
        'Kimlik belirtecinde `sub` yok',
      );
    }

    return {
      provider: this.provider,
      subject,
      email: readString(payload, 'email'),
      // Apple bu alanı bazen dize ("true") olarak gönderiyor.
      emailVerified: readBoolean(payload, 'email_verified'),
      displayName: readString(payload, 'name'),
    };
  }
}

function readString(payload: JWTPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readBoolean(payload: JWTPayload, key: string): boolean {
  const value = payload[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

/** Sign in with Apple — doğrulanmış uç noktalar (developer.apple.com). */
export const APPLE_OIDC = {
  jwksUri: 'https://appleid.apple.com/auth/keys',
  issuers: ['https://appleid.apple.com'],
} as const;

/** Google Sign-In — doğrulanmış uç noktalar (developers.google.com). */
export const GOOGLE_OIDC = {
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  // Google her iki biçimi de kullanıyor; ikisi de kabul edilmeli.
  issuers: ['https://accounts.google.com', 'accounts.google.com'],
} as const;
