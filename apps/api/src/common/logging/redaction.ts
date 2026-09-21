/**
 * Loglarda maskelenecek alanlar (BACKEND_SPEC §6).
 * Token, e-posta ve imzalı görsel URL'leri log'a düz metin olarak YAZILMAZ.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-revenuecat-webhook-signature"]',
  'req.headers["idempotency-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.accessToken',
  '*.refreshToken',
  '*.idToken',
  '*.apiKey',
  '*.secret',
  '*.otp',
  '*.code',
  '*.email',
  '*.signedUrl',
  '*.uploadUrl',
  'headers.authorization',
  'body.email',
  'body.idToken',
  'body.otp',
];

/**
 * Sorgu parametrelerindeki imza alanlarını kırpar; presigned URL'ler log'a
 * girdiğinde imzanın tamamı görünmesin diye.
 */
const SIGNATURE_PARAMS = ['X-Amz-Signature', 'X-Amz-Credential', 'signature', 'token', 'sig'];

export function maskUrl(raw: string): string {
  try {
    const url = new URL(raw);
    let touched = false;
    for (const param of SIGNATURE_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, '[REDACTED]');
        touched = true;
      }
    }
    return touched ? url.toString() : raw;
  } catch {
    return raw;
  }
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '[REDACTED]';
  const name = email.slice(0, at);
  const head = name.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(name.length - 1, 1))}@${email.slice(at + 1)}`;
}
