import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { User } from '../../../db/schema/users.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

/** Guard'ın isteğe koyduğu kullanıcıyı controller'a verir. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      // Guard çalışmadan buraya gelinmiş demektir — programlama hatası.
      throw new Error('CurrentUser, JwtAuthGuard olmadan kullanılamaz');
    }
    return request.user;
  },
);
