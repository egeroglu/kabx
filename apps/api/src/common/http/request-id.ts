import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Fastify'ın `genReqId` kancası. İstemci `x-request-id` gönderirse onu kullanır
 * (mobil ile sunucu logları eşleşsin diye), yoksa yeni üretir.
 */
export function generateRequestId(req: { headers: Record<string, unknown> }): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  if (typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128) {
    return incoming;
  }
  return randomUUID();
}

export function requestIdOf(request: FastifyRequest): string {
  return String(request.id);
}
