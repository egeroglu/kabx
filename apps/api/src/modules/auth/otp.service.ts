import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm';

import { AppConfig } from '../../common/config/app-config.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Database } from '../../db/client.js';
import { DB } from '../../db/db.module.js';
import { emailOtps } from '../../db/schema/auth.js';
import { EmailProvider } from '../email/email-provider.js';
import { generateOtpCode, TokenHasher } from './token.hash.js';

@Injectable()
export class OtpService {
  private readonly hasher: TokenHasher;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: AppConfig,
    private readonly email: EmailProvider,
  ) {
    this.hasher = new TokenHasher(config.get('AUTH_HASH_SECRET'));
  }

  /**
   * Kod üretir, HMAC'ini saklar ve e-postayı gönderir.
   *
   * Uç nokta e-postanın kayıtlı olup olmadığına BAKMAKSIZIN aynı cevabı döner
   * (hesap sayımı/enumeration önlenir); bu yüzden burada "kullanıcı var mı"
   * kontrolü yok — kullanıcı doğrulama anında oluşturulur.
   */
  async request(email: string, ip: string | null): Promise<void> {
    const normalized = normalizeEmail(email);
    const now = new Date();

    await this.enforceCooldown(normalized, now);

    const code = generateOtpCode();
    const ttl = this.config.get('OTP_TTL_SECONDS');

    await this.db.insert(emailOtps).values({
      email: normalized,
      codeHash: this.hasher.hash(code),
      expiresAt: new Date(now.getTime() + ttl * 1000),
      requestIp: ip,
    });

    const minutes = Math.round(ttl / 60);
    await this.email.send({
      to: normalized,
      // Backend kullanıcıya gösterilecek arayüz metni üretmez, ama e-posta
      // gövdesi istemcide render edilmediği için burada oluşmak zorunda.
      subject: `Kabx giriş kodun: ${code}`,
      text: [
        `Kabx giriş kodun: ${code}`,
        '',
        `Kod ${minutes} dakika geçerli.`,
        'Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.',
      ].join('\n'),
    });
  }

  /**
   * Kodu doğrular ve tüketir. Başarısız denemeler sayılır; sınır aşılınca
   * kayıt tüketilmiş sayılır ki brute-force tek bir istekle sürdürülemesin.
   */
  async verify(email: string, code: string): Promise<string> {
    const normalized = normalizeEmail(email);
    const now = new Date();

    const [otp] = await this.db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.email, normalized),
          isNull(emailOtps.consumedAt),
          gt(emailOtps.expiresAt, now),
        ),
      )
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);

    if (!otp) {
      throw AppException.unauthorized(ErrorCode.OTP_EXPIRED, 'Geçerli bir kod bulunamadı');
    }

    const maxAttempts = this.config.get('OTP_MAX_ATTEMPTS');
    if (otp.attempts >= maxAttempts) {
      await this.consume(otp.id, now);
      throw AppException.tooManyRequests(
        ErrorCode.OTP_TOO_MANY_ATTEMPTS,
        'Çok fazla hatalı deneme; yeni kod iste',
      );
    }

    if (!this.hasher.matches(code, otp.codeHash)) {
      const [updated] = await this.db
        .update(emailOtps)
        .set({ attempts: sql`${emailOtps.attempts} + 1` })
        .where(eq(emailOtps.id, otp.id))
        .returning({ attempts: emailOtps.attempts });

      if ((updated?.attempts ?? 0) >= maxAttempts) {
        await this.consume(otp.id, now);
        throw AppException.tooManyRequests(
          ErrorCode.OTP_TOO_MANY_ATTEMPTS,
          'Çok fazla hatalı deneme; yeni kod iste',
        );
      }

      throw AppException.unauthorized(ErrorCode.OTP_INVALID, 'Kod hatalı');
    }

    await this.consume(otp.id, now);
    return normalized;
  }

  /** Süresi geçmiş kodları siler (bakım işi). */
  async pruneExpired(now = new Date()): Promise<number> {
    const removed = await this.db
      .delete(emailOtps)
      .where(lt(emailOtps.expiresAt, now))
      .returning({ id: emailOtps.id });
    return removed.length;
  }

  /** Aynı adrese saniyede bir kod istenmesini engeller (e-posta bombardımanı). */
  private async enforceCooldown(email: string, now: Date): Promise<void> {
    const cooldown = this.config.get('OTP_RESEND_COOLDOWN_SECONDS');
    if (cooldown <= 0) return;

    const since = new Date(now.getTime() - cooldown * 1000);
    const [recent] = await this.db
      .select({ id: emailOtps.id })
      .from(emailOtps)
      .where(and(eq(emailOtps.email, email), gt(emailOtps.createdAt, since)))
      .limit(1);

    if (recent) {
      throw AppException.tooManyRequests(
        ErrorCode.RATE_LIMITED,
        `Yeni kod istemek için ${cooldown} saniye bekle`,
      );
    }
  }

  private async consume(id: string, at: Date): Promise<void> {
    await this.db.update(emailOtps).set({ consumedAt: at }).where(eq(emailOtps.id, id));
  }
}

/** E-postalar her zaman küçük harfe ve kırpılmış biçime normalize edilir. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
