import type { ZodError } from 'zod';

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

/**
 * Zod hatalarını istemcinin işleyebileceği sade bir listeye çevirir.
 * `message` geliştirici içindir; mobil kullanıcıya `path` + `code` ile kendi metnini üretir.
 */
export function zodIssuesToDetails(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    code: issue.code,
    message: issue.message,
  }));
}
