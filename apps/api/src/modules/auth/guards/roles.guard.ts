import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

export const ROLES_KEY = 'kabx:roles';

/** `/v1/admin` altındaki uçlar için (BACKEND_SPEC §5.14). */
export const Roles = (...roles: ('user' | 'admin')[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<('user' | 'admin')[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    if (!role || !required.includes(role)) {
      // Yetkisizlikte 404 değil 403: kaynak değil, yetki sorunu.
      throw AppException.forbidden(ErrorCode.FORBIDDEN, 'Bu işlem için yetkin yok');
    }
    return true;
  }
}
