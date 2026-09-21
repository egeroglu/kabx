import { describe, expect, it } from 'vitest';

import { AppException } from '../../src/common/errors/app.exception.js';
import { ErrorCode } from '../../src/common/errors/error-codes.js';
import {
  buildPage,
  decodeCursor,
  encodeCursor,
  paginationQuerySchema,
} from '../../src/common/pagination/cursor.js';

describe('cursor sayfalama', () => {
  it('kodlama ve çözme birbirinin tersi', () => {
    const cursor = { k: '2026-09-21T10:00:00.000Z', i: '01a0c413-e48a-7105-9f35-500ae46482cf' };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('cursor istemci için opak: ham değer sızmaz', () => {
    const encoded = encodeCursor({ k: '2026-09-21T10:00:00.000Z', i: 'abc' });
    expect(encoded).not.toContain('2026-09-21');
    expect(encoded).not.toContain('abc');
  });

  it('bozuk cursor INVALID_CURSOR döner', () => {
    expect(() => decodeCursor('bu-base64-degil!!!')).toThrow(AppException);
    try {
      decodeCursor('bu-base64-degil!!!');
    } catch (error) {
      expect((error as AppException).code).toBe(ErrorCode.INVALID_CURSOR);
    }
  });

  it('doğru base64 ama yanlış şekilli cursor da reddedilir', () => {
    const bad = Buffer.from(JSON.stringify({ nope: 1 })).toString('base64url');
    try {
      decodeCursor(bad);
      expect.unreachable('reddedilmeliydi');
    } catch (error) {
      expect((error as AppException).code).toBe(ErrorCode.INVALID_CURSOR);
    }
  });

  const rows = Array.from({ length: 5 }, (_, n) => ({
    id: `id-${n}`,
    createdAt: `2026-09-0${n + 1}`,
  }));
  const toCursor = (row: { id: string; createdAt: string }) => ({ k: row.createdAt, i: row.id });

  it('limit+1 kayıt geldiğinde fazlalığı kırpar ve hasMore der', () => {
    const page = buildPage(rows, 4, toCursor);
    expect(page.items).toHaveLength(4);
    expect(page.pageInfo.hasMore).toBe(true);
    expect(page.pageInfo.nextCursor).not.toBeNull();
    // Cursor son DÖNEN kaydı işaret eder, kırpılanı değil.
    expect(decodeCursor(page.pageInfo.nextCursor!)).toEqual({ k: '2026-09-04', i: 'id-3' });
  });

  it('son sayfada nextCursor null döner', () => {
    const page = buildPage(rows, 5, toCursor);
    expect(page.items).toHaveLength(5);
    expect(page.pageInfo.hasMore).toBe(false);
    expect(page.pageInfo.nextCursor).toBeNull();
  });

  it('boş sonuç da geçerli bir sayfadır', () => {
    const page = buildPage([], 20, toCursor);
    expect(page.items).toEqual([]);
    expect(page.pageInfo).toEqual({ hasMore: false, nextCursor: null });
  });

  it('limit varsayılanı ve üst sınırı uygulanır', () => {
    expect(paginationQuerySchema.parse({}).limit).toBe(20);
    expect(paginationQuerySchema.parse({ limit: '50' }).limit).toBe(50);
    expect(paginationQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});
