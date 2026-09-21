import { z } from 'zod';

import { createZodDto } from '../../../common/validation/zod-dto.js';

const idToken = z.string().min(16).max(8192);

export const appleSignInSchema = z.object({
  idToken: idToken.describe('Sign in with Apple identity token (JWT)'),
  /**
   * Apple kullanıcının adını yalnızca İLK yetkilendirmede veriyor ve ID
   * token'ın içinde değil; istemci o anda yakalayıp buradan göndermeli.
   */
  displayName: z.string().trim().min(1).max(80).nullish(),
});
export class AppleSignInDto extends createZodDto('AppleSignInInput', appleSignInSchema) {}

export const googleSignInSchema = z.object({
  idToken: idToken.describe('Google Sign-In ID token (JWT)'),
});
export class GoogleSignInDto extends createZodDto('GoogleSignInInput', googleSignInSchema) {}

export const emailCodeRequestSchema = z.object({
  email: z.email().max(320),
});
export class EmailCodeRequestDto extends createZodDto(
  'EmailCodeRequestInput',
  emailCodeRequestSchema,
) {}

export const emailCodeVerifySchema = z.object({
  email: z.email().max(320),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, '6 haneli kod bekleniyor'),
});
export class EmailCodeVerifyDto extends createZodDto(
  'EmailCodeVerifyInput',
  emailCodeVerifySchema,
) {}

export const refreshSchema = z.object({
  refreshToken: z.string().min(16).max(512),
});
export class RefreshDto extends createZodDto('RefreshInput', refreshSchema) {}
export class LogoutDto extends createZodDto('LogoutInput', refreshSchema) {}

export const sessionSchema = z.object({
  accessToken: z.string(),
  /** Saniye. İstemci bundan kısa bir süre önce yenilemeli. */
  expiresIn: z.number().int(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.iso.datetime(),
});
export class SessionDto extends createZodDto('Session', sessionSchema) {}

export const authResultSchema = z.object({
  session: sessionSchema,
  userId: z.uuid(),
  isNewUser: z.boolean().describe('true ise istemci onboarding akışına gider'),
  onboardingCompleted: z.boolean(),
});
export class AuthResultDto extends createZodDto('AuthResult', authResultSchema) {}

export const acceptedSchema = z.object({ accepted: z.literal(true) });
export class AcceptedDto extends createZodDto('Accepted', acceptedSchema) {}
