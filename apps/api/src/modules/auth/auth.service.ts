import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { authIdentities, users, type User } from '../../db/schema/users.js';
import {
  APPLE_IDENTITY_PROVIDER,
  GOOGLE_IDENTITY_PROVIDER,
  IdentityProvider,
  type VerifiedIdentity,
} from './identity/identity-provider.js';
import { normalizeEmail, OtpService } from './otp.service.js';
import { TokenService, type IssuedSession, type SessionContext } from './token.service.js';

export type AuthResult = {
  session: IssuedSession;
  user: User;
  /** İstemci bu bayrakla onboarding'e mi yoksa ana ekrana mı gideceğini bilir. */
  isNewUser: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(APPLE_IDENTITY_PROVIDER) private readonly apple: IdentityProvider,
    @Inject(GOOGLE_IDENTITY_PROVIDER) private readonly google: IdentityProvider,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
  ) {}

  async signInWithApple(
    idToken: string,
    displayName: string | null,
    context: SessionContext,
  ): Promise<AuthResult> {
    const identity = await this.apple.verify(idToken);
    // Apple kullanıcının adını YALNIZCA ilk yetkilendirmede döner ve o da
    // ID token'da değil, istemcinin aldığı ayrı bir alanda. Bu yüzden istemci
    // adı bize ayrıca gönderiyor.
    return this.upsertFromIdentity(
      { ...identity, displayName: identity.displayName ?? displayName },
      context,
    );
  }

  async signInWithGoogle(idToken: string, context: SessionContext): Promise<AuthResult> {
    const identity = await this.google.verify(idToken);
    return this.upsertFromIdentity(identity, context);
  }

  requestEmailCode(email: string, ip: string | null): Promise<void> {
    return this.otp.request(email, ip);
  }

  async verifyEmailCode(email: string, code: string, context: SessionContext): Promise<AuthResult> {
    const verifiedEmail = await this.otp.verify(email, code);

    return this.upsertFromIdentity(
      {
        provider: 'email' as never,
        subject: verifiedEmail,
        email: verifiedEmail,
        emailVerified: true,
        displayName: null,
      },
      context,
    );
  }

  refresh(refreshToken: string, context: SessionContext): Promise<IssuedSession> {
    return this.tokens.rotate(refreshToken, context);
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revokeByToken(refreshToken);
  }

  /**
   * Kimlikten kullanıcı bulur ya da oluşturur.
   *
   * Eşleştirme sırası önemli:
   *  1. (provider, subject) — sağlayıcının kararlı kimliği. E-posta değişse
   *     bile aynı hesaba düşer.
   *  2. Doğrulanmış e-posta — aynı adresle önce Google sonra Apple ile gelen
   *     kişi iki ayrı hesap açmasın diye.
   *
   * DOĞRULANMAMIŞ e-posta ile asla eşleştirme yapılmaz: bir sağlayıcı
   * doğrulanmamış bir adres bildirirse, o adresi kullanan gerçek hesabın
   * ele geçirilmesine yol açardı.
   */
  private async upsertFromIdentity(
    identity: VerifiedIdentity & { provider: 'apple' | 'google' | 'email' },
    context: SessionContext,
  ): Promise<AuthResult> {
    const email = identity.email ? normalizeEmail(identity.email) : null;

    const result = await this.db.transaction(async (tx) => {
      const [existingIdentity] = await tx
        .select({ userId: authIdentities.userId })
        .from(authIdentities)
        .where(
          and(
            eq(authIdentities.provider, identity.provider),
            eq(authIdentities.subject, identity.subject),
          ),
        )
        .limit(1);

      if (existingIdentity) {
        await tx
          .update(authIdentities)
          .set({ lastUsedAt: new Date(), email })
          .where(
            and(
              eq(authIdentities.provider, identity.provider),
              eq(authIdentities.subject, identity.subject),
            ),
          );
        const user = await loadUser(tx, existingIdentity.userId);
        return { user, isNewUser: false };
      }

      if (email && identity.emailVerified) {
        const [byEmail] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
        if (byEmail) {
          assertUsable(byEmail);
          await tx.insert(authIdentities).values({
            userId: byEmail.id,
            provider: identity.provider,
            subject: identity.subject,
            email,
            lastUsedAt: new Date(),
          });
          return { user: byEmail, isNewUser: false };
        }
      }

      const [created] = await tx
        .insert(users)
        .values({
          email,
          emailVerified: email && identity.emailVerified ? new Date() : null,
          displayName: identity.displayName?.slice(0, 80) ?? null,
        })
        .returning();

      if (!created) throw new Error('Kullanıcı oluşturulamadı');

      await tx.insert(authIdentities).values({
        userId: created.id,
        provider: identity.provider,
        subject: identity.subject,
        email,
        lastUsedAt: new Date(),
      });

      return { user: created, isNewUser: true };
    });

    assertUsable(result.user);

    const session = await this.tokens.issueSession(result.user.id, result.user.role, context);
    await this.db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, result.user.id));

    return { session, user: result.user, isNewUser: result.isNewUser };
  }
}

async function loadUser(tx: Database, userId: string): Promise<User> {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Kimliğe bağlı kullanıcı bulunamadı');
  }
  return user;
}

/** Silinmekte olan hesaba giriş yapılamaz. */
function assertUsable(user: User): void {
  if (user.status === 'pending_deletion') {
    throw AppException.forbidden(
      ErrorCode.ACCOUNT_DELETION_IN_PROGRESS,
      'Hesap silme işlemi sürüyor',
    );
  }
}
