import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { v7 as uuidv7 } from 'uuid';

import { AppConfig } from '../../common/config/app-config.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { getRootLogger } from '../../common/logging/logger.js';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { refreshTokens } from '../../db/schema/auth.js';
import { users } from '../../db/schema/users.js';
import { generateRefreshToken, TokenHasher } from './token.hash.js';

export type AccessTokenClaims = {
  sub: string;
  role: 'user' | 'admin';
};

export type IssuedSession = {
  accessToken: string;
  /** Saniye cinsinden; istemci buna göre yenileme zamanlar. */
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

export type SessionContext = {
  deviceLabel?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class TokenService {
  private readonly hasher: TokenHasher;
  private readonly accessSecret: Uint8Array;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: AppConfig,
  ) {
    this.hasher = new TokenHasher(config.get('AUTH_HASH_SECRET'));
    this.accessSecret = new TextEncoder().encode(config.get('JWT_ACCESS_SECRET'));
  }

  /** Yeni giriş: yeni bir rotasyon zinciri başlatır. */
  issueSession(
    userId: string,
    role: 'user' | 'admin',
    context: SessionContext = {},
  ): Promise<IssuedSession> {
    return this.issue(userId, role, uuidv7(), context, null);
  }

  /**
   * Refresh token rotasyonu (BACKEND_SPEC §4).
   *
   * Her yenileme eski token'ı tüketir ve yenisini verir. Aynı token ikinci kez
   * gelirse bu ya ağ tekrarı ya da çalınmış token demektir; ikisini ayırt
   * edemediğimiz için güvenli tarafta kalıp zincirin TAMAMINI iptal ediyoruz —
   * hem saldırganın hem gerçek kullanıcının oturumu düşer, kullanıcı yeniden
   * giriş yapar.
   *
   * Token'ı ATOMİK bir UPDATE ile sahipleniyoruz (önce oku sonra yaz DEĞİL):
   * aynı token'la eşzamanlı gelen iki istekte yalnızca biri satırı alabilir,
   * diğeri "yeniden kullanım" koluna düşer. Okuyup sonra güncelleseydik ikisi
   * de geçerli oturum alırdı ve çalınmış token tespiti işe yaramazdı.
   */
  async rotate(rawToken: string, context: SessionContext = {}): Promise<IssuedSession> {
    const tokenHash = this.hasher.hash(rawToken);
    const now = new Date();

    const [claimed] = await this.db
      .update(refreshTokens)
      .set({ usedAt: now, revokedAt: now, revokeReason: 'rotated' })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.usedAt),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .returning({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
      });

    if (!claimed) {
      throw await this.rotationFailure(tokenHash);
    }

    const role = await this.resolveRole(claimed.userId);
    const issued = await this.issue(claimed.userId, role, claimed.familyId, context, claimed.id);
    return issued;
  }

  /** Çıkış: yalnızca bu cihazın zinciri iptal edilir, diğer cihazlar etkilenmez. */
  async revokeByToken(rawToken: string): Promise<void> {
    const [existing] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, this.hasher.hash(rawToken)))
      .limit(1);

    // Bilinmeyen token'da da sessizce başarılı dönüyoruz: çıkış isteği
    // başarısız olmamalı ve token'ın var olup olmadığı bilgisi sızmamalı.
    if (existing) await this.revokeFamily(existing.familyId, 'logout');
  }

  async revokeAllForUser(
    userId: string,
    reason: 'account_deleted' | 'device_removed' | 'logout',
  ): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), revokeReason: reason })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret, {
        issuer: this.config.get('JWT_ISSUER'),
        audience: this.config.get('JWT_AUDIENCE'),
      });
      const sub = payload.sub;
      const role = payload['role'];
      if (!sub || (role !== 'user' && role !== 'admin')) {
        throw new Error("token gerekli claim'leri taşımıyor");
      }
      return { sub, role };
    } catch (error) {
      const message = (error as Error).message;
      const expired = message.includes('exp') || message.includes('expired');
      throw AppException.unauthorized(
        expired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.UNAUTHORIZED,
        `Access token geçersiz: ${message}`,
      );
    }
  }

  /** Süresi geçmiş ya da iptal edilmiş kayıtları siler (bakım işi). */
  async pruneExpired(now = new Date()): Promise<number> {
    const removed = await this.db
      .delete(refreshTokens)
      .where(or(lt(refreshTokens.expiresAt, now), lt(refreshTokens.revokedAt, now)))
      .returning({ id: refreshTokens.id });
    return removed.length;
  }

  /**
   * Atomik sahiplenme başarısız olduğunda nedenini ayırt eder.
   * Hatayı fırlatmak yerine DÖNER; çağıran `throw` eder, böylece TypeScript
   * akış analizinde `claimed`'in tanımlı olduğunu görebilir.
   */
  private async rotationFailure(tokenHash: string): Promise<AppException> {
    const [existing] = await this.db
      .select({
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        usedAt: refreshTokens.usedAt,
        revokedAt: refreshTokens.revokedAt,
        expiresAt: refreshTokens.expiresAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!existing) {
      return AppException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh token bulunamadı');
    }

    if (existing.usedAt || existing.revokedAt) {
      await this.revokeFamily(existing.familyId, 'reuse_detected');
      getRootLogger().warn(
        { userId: existing.userId, familyId: existing.familyId },
        'refresh token yeniden kullanıldı — zincirin tamamı iptal edildi',
      );
      return AppException.unauthorized(
        ErrorCode.REFRESH_TOKEN_REUSED,
        'Refresh token yeniden kullanıldı; oturum zincirinin tamamı iptal edildi',
      );
    }

    return AppException.unauthorized(
      ErrorCode.REFRESH_TOKEN_INVALID,
      'Refresh token süresi dolmuş',
    );
  }

  private async issue(
    userId: string,
    role: 'user' | 'admin',
    familyId: string,
    context: SessionContext,
    predecessorId: string | null,
  ): Promise<IssuedSession> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL_SECONDS');
    const refreshTtlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS');

    const accessToken = await new SignJWT({ role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(this.config.get('JWT_ISSUER'))
      .setAudience(this.config.get('JWT_AUDIENCE'))
      .setIssuedAt()
      .setExpirationTime(`${accessTtl}s`)
      .sign(this.accessSecret);

    const rawRefresh = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTtlDays * 86_400_000);

    const [created] = await this.db
      .insert(refreshTokens)
      .values({
        userId,
        familyId,
        tokenHash: this.hasher.hash(rawRefresh),
        expiresAt: refreshTokenExpiresAt,
        deviceLabel: context.deviceLabel ?? null,
        userAgent: context.userAgent?.slice(0, 255) ?? null,
      })
      .returning({ id: refreshTokens.id });

    // Zinciri izlenebilir kıl: hangi token hangisinin yerine geçti.
    if (predecessorId && created) {
      await this.db
        .update(refreshTokens)
        .set({ replacedBy: created.id })
        .where(eq(refreshTokens.id, predecessorId));
    }

    return { accessToken, expiresIn: accessTtl, refreshToken: rawRefresh, refreshTokenExpiresAt };
  }

  private async revokeFamily(
    familyId: string,
    reason: 'reuse_detected' | 'logout' | 'account_deleted',
  ): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()`, revokeReason: reason })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }

  private async resolveRole(userId: string): Promise<'user' | 'admin'> {
    const [row] = await this.db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) {
      throw AppException.unauthorized(ErrorCode.REFRESH_TOKEN_INVALID, 'Kullanıcı bulunamadı');
    }
    if (row.status === 'pending_deletion') {
      throw AppException.forbidden(
        ErrorCode.ACCOUNT_DELETION_IN_PROGRESS,
        'Hesap silme işlemi sürüyor',
      );
    }
    return row.role;
  }
}
