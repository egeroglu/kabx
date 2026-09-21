import { z } from 'zod';

import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';

/**
 * Cursor tabanlı sayfalama (BACKEND_SPEC §3.7).
 *
 * Cursor istemci için opak bir dizedir: base64url'lenmiş JSON. İçeriği
 * (sıralama anahtarı + id) sözleşmenin parçası DEĞİLDİR; sunucu istediği zaman
 * değiştirebilir. Offset kullanılmaz — araya yeni kayıt girince sayfa kaymasın diye.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Sıralama anahtarı: (createdAt, id) çifti — id eşitlik durumunu kırar. */
export type KeysetCursor = {
  /** ISO-8601 zaman damgası ya da başka bir sıralanabilir dize. */
  k: string;
  /** Kayıt kimliği (UUID v7). */
  i: string;
};

const cursorSchema = z.object({ k: z.string().min(1), i: z.string().min(1) });

export function encodeCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): KeysetCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw AppException.badRequest(ErrorCode.INVALID_CURSOR, 'Cursor could not be decoded');
  }
  const result = cursorSchema.safeParse(parsed);
  if (!result.success) {
    throw AppException.badRequest(ErrorCode.INVALID_CURSOR, 'Cursor payload is malformed');
  }
  return result.data;
}

export type Page<T> = {
  items: T[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
};

/**
 * Sorgudan `limit + 1` kayıt çekip bu fonksiyona verin: fazlalık kırpılır ve
 * sonraki sayfanın var olup olmadığı buradan anlaşılır.
 */
export function buildPage<T>(
  rows: T[],
  limit: number,
  toCursor: (row: T) => KeysetCursor,
): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    pageInfo: {
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(toCursor(last)) : null,
    },
  };
}
