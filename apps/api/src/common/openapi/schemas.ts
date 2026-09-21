import { z } from 'zod';

import { ALL_ERROR_CODES } from '../errors/error-codes.js';

/** Ortak hata gövdesi — her uçta aynı (BACKEND_SPEC §3.6). */
export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z
        .enum(ALL_ERROR_CODES as [string, ...string[]])
        .describe('Mobilde i18n anahtarı olarak kullanılır'),
      message: z.string().describe('Geliştirici içindir; kullanıcıya gösterilmez'),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  })
  .describe('Kabx API hata cevabı');

/** Cursor tabanlı sayfalama zarfı (BACKEND_SPEC §3.7). */
export const pageInfoSchema = z
  .object({
    nextCursor: z.string().nullable().describe('Sonraki sayfa yoksa null'),
    hasMore: z.boolean(),
  })
  .describe('Sayfalama bilgisi');

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'error', 'shutting_down']),
  info: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  error: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  details: z.record(z.string(), z.record(z.string(), z.unknown())),
});
