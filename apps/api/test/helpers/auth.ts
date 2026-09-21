import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export type SignInResult = {
  session: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  };
  userId: string;
  isNewUser: boolean;
  onboardingCompleted: boolean;
};

/**
 * Mock kimlik sağlayıcısı üzerinden giriş yapar.
 * Gerçek Apple/Google hesabı gerekmez.
 *
 * Belirteç HER ZAMAN dört segment gönderir (`mock:subject:email:ad`); boş
 * segmentler null sayılır. Segment atlamak konum kaymasına yol açardı:
 * e-postasız ama adlı bir kullanıcıda ad, e-posta sanılırdı.
 */
export async function signIn(
  app: NestFastifyApplication,
  options: {
    provider: 'apple' | 'google';
    subject: string;
    email?: string;
    displayName?: string;
  },
): Promise<SignInResult> {
  const parts = ['mock', options.subject, options.email ?? '', options.displayName ?? ''];

  const response = await app.inject({
    method: 'POST',
    url: `/v1/auth/${options.provider}`,
    payload: { idToken: parts.join(':') },
  });

  if (response.statusCode !== 200) {
    throw new Error(`giriş başarısız: ${response.statusCode} ${response.body}`);
  }
  return response.json();
}

/** Yetkili istekler için Authorization başlığı. */
export function authHeader(session: SignInResult): { authorization: string } {
  return { authorization: `Bearer ${session.session.accessToken}` };
}
