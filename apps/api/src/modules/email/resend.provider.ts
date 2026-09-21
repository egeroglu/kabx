import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { getRootLogger } from '../../common/logging/logger.js';
import { maskEmail } from '../../common/logging/redaction.js';
import { EmailProvider, type EmailMessage } from './email-provider.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Resend REST API (resend.com/docs/api-reference/emails/send-email).
 * SDK yerine doğrudan fetch: tek uç nokta için bağımlılık eklemeye değmez.
 */
export class ResendEmailProvider extends EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (message.idempotencyKey) {
      headers['Idempotency-Key'] = message.idempotencyKey;
    }

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // Alıcı adresi log'a maskeli girer.
      getRootLogger().error(
        { status: response.status, to: maskEmail(message.to), body: body.slice(0, 500) },
        'Resend gönderimi başarısız',
      );
      throw AppException.serviceUnavailable(
        ErrorCode.SERVICE_UNAVAILABLE,
        `Resend ${response.status} döndü`,
      );
    }
  }
}

/**
 * Yerel geliştirme: e-posta gönderilmez, log'a yazılır.
 * OTP kodunu terminalden okuyup akışı tamamlayabilirsin.
 */
export class LogEmailProvider extends EmailProvider {
  send(message: EmailMessage): Promise<void> {
    getRootLogger().info(
      { to: maskEmail(message.to), subject: message.subject, body: message.text },
      'e-posta (mock sağlayıcı — gönderilmedi)',
    );
    return Promise.resolve();
  }
}
