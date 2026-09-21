import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { IdentityProvider, type VerifiedIdentity } from './identity-provider.js';

/**
 * Yerel geliştirme ve testler için sahte kimlik sağlayıcısı.
 *
 * Gerçek Apple/Google hesabı olmadan tüm giriş akışını denemeye yarar.
 * `idToken` olarak `mock:<subject>[:<email>[:<ad>]]` biçiminde bir dize alır:
 *
 *   mock:apple-user-1
 *   mock:apple-user-1:ayse@example.com:Ayşe
 *   mock:apple-user-1::Ayşe          (e-posta yok, ad var)
 *
 * Boş segmentler `null` sayılır; böylece yalnızca ad vermek isteyen çağıran
 * e-posta alanını atlayarak konum kaydırmaz.
 *
 * ASLA production'da etkinleşmez: `IDENTITY_PROVIDER_MODE=live` olduğunda
 * kurulum aşamasında gerçek sağlayıcıyla değiştirilir.
 */
export class MockIdentityProvider extends IdentityProvider {
  constructor(readonly provider: 'apple' | 'google') {
    super();
  }

  // `async`: hata senkron fırlamasın. Gerçek sağlayıcı ağ çağrısı yapıyor ve
  // her zaman reddedilen bir Promise döndürüyor; mock da aynı sözleşmeye uymalı,
  // yoksa `verify(...).catch(...)` yazan çağıran mock'ta çöker.
  // IdentityProvider sözleşmesi Promise döndürmeyi şart koşar: `async`
  // olmazsa hata senkron fırlar ve `verify(...).catch(...)` yazan çağıran çöker.
  // eslint-disable-next-line @typescript-eslint/require-await
  async verify(idToken: string): Promise<VerifiedIdentity> {
    if (!idToken.startsWith('mock:')) {
      throw AppException.unauthorized(
        ErrorCode.IDENTITY_PROVIDER_REJECTED,
        'Mock modda belirteç `mock:<subject>[:<email>[:<ad>]]` biçiminde olmalı',
      );
    }

    const [, subject, email, displayName] = idToken.split(':');
    if (!subject) {
      throw AppException.unauthorized(
        ErrorCode.IDENTITY_PROVIDER_REJECTED,
        'Mock belirtecinde subject yok',
      );
    }

    const normalizedEmail = email ? email : null;

    return {
      provider: this.provider,
      subject,
      email: normalizedEmail,
      emailVerified: normalizedEmail !== null,
      displayName: displayName ? displayName : null,
    };
  }
}
