import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';

import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import type { Database } from '../../../db/client.js';
import { DB } from '../../../db/db.module.js';
import { users, type User } from '../../../db/schema/users.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { TokenService } from '../token.service.js';

/** İstek üzerinde taşınan kimliği doğrulanmış kullanıcı. */
export type AuthenticatedRequest = FastifyRequest & { user?: User };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Authorization başlığı yok');
    }

    const claims = await this.tokens.verifyAccessToken(token);

    // Kullanıcıyı her istekte DB'den okuyoruz: rol değişikliği, hesap silme ve
    // askıya alma access token'ın 15 dakikalık ömrünü beklemeden etkili olsun.
    const [user] = await this.db.select().from(users).where(eq(users.id, claims.sub)).limit(1);

    if (!user) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Token geçerli ama kullanıcı yok');
    }
    if (user.status === 'pending_deletion') {
      throw AppException.forbidden(
        ErrorCode.ACCOUNT_DELETION_IN_PROGRESS,
        'Hesap silme işlemi sürüyor',
      );
    }

    request.user = user;
    return true;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value;
}
