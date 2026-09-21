/**
 * Dış kimlik sağlayıcıları (Apple, Google) tek arayüzün arkasında.
 * Testlerde ve yerel geliştirmede mock uygulama kullanılır; gerçek ağ
 * çağrısı olmadan tüm giriş akışı denenebilir.
 */
export type VerifiedIdentity = {
  provider: 'apple' | 'google';
  /** Sağlayıcının kararlı kullanıcı kimliği (`sub`). E-posta değişse bile sabit. */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

export abstract class IdentityProvider {
  abstract readonly provider: 'apple' | 'google';
  /**
   * ID token'ın imzasını, issuer'ını, audience'ını ve süresini doğrular.
   * Geçersizse `IDENTITY_PROVIDER_REJECTED` fırlatır.
   */
  abstract verify(idToken: string): Promise<VerifiedIdentity>;
}

export const APPLE_IDENTITY_PROVIDER = Symbol('APPLE_IDENTITY_PROVIDER');
export const GOOGLE_IDENTITY_PROVIDER = Symbol('GOOGLE_IDENTITY_PROVIDER');
