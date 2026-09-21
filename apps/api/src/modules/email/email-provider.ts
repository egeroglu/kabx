/**
 * Transactional e-posta tek arayüzün arkasında (BACKEND_SPEC §4).
 * Backend kullanıcıya gösterilecek metin üretmediği için gövde şablonu
 * burada değil; sağlayıcı yalnızca konu ve içerik alır.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Aynı e-postanın tekrar gönderilmesini engeller (Resend destekliyor). */
  idempotencyKey?: string;
};

export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<void>;
}
