import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { ErrorCode } from '../../common/errors/error-codes.js';
import { ApiErrorResponse, ApiZodBody, ApiZodResponse } from '../../common/openapi/decorators.js';
import { AuthService } from './auth.service.js';
import {
  AcceptedDto,
  AppleSignInDto,
  AuthResultDto,
  EmailCodeRequestDto,
  EmailCodeVerifyDto,
  GoogleSignInDto,
  LogoutDto,
  RefreshDto,
  SessionDto,
} from './dto/auth.dto.js';
import { Public } from './guards/public.decorator.js';
import type { AuthResult } from './auth.service.js';
import type { IssuedSession, SessionContext } from './token.service.js';

@ApiTags('auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with Apple',
    description:
      'Apple ID token sunucuda doğrulanır (imza, iss, aud, süre). Apple kullanıcının adını ' +
      'yalnızca ilk yetkilendirmede verdiği için istemci `displayName` alanını o anda göndermelidir.',
  })
  @ApiZodBody(AppleSignInDto)
  @ApiZodResponse(200, AuthResultDto)
  @ApiErrorResponse(401, [ErrorCode.IDENTITY_PROVIDER_REJECTED])
  @ApiErrorResponse(403, [ErrorCode.ACCOUNT_DELETION_IN_PROGRESS])
  async apple(
    @Body() body: AppleSignInDto,
    @Req() request: FastifyRequest,
  ): Promise<AuthResultResponse> {
    return present(
      await this.auth.signInWithApple(body.idToken, body.displayName ?? null, contextOf(request)),
    );
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google Sign-In' })
  @ApiZodBody(GoogleSignInDto)
  @ApiZodResponse(200, AuthResultDto)
  @ApiErrorResponse(401, [ErrorCode.IDENTITY_PROVIDER_REJECTED])
  @ApiErrorResponse(403, [ErrorCode.ACCOUNT_DELETION_IN_PROGRESS])
  async google(
    @Body() body: GoogleSignInDto,
    @Req() request: FastifyRequest,
  ): Promise<AuthResultResponse> {
    return present(await this.auth.signInWithGoogle(body.idToken, contextOf(request)));
  }

  @Post('email/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'E-posta ile giriş: kod iste',
    description:
      'Adresin kayıtlı olup olmadığına bakılmaksızın HER ZAMAN aynı cevabı döner — ' +
      'hangi e-postaların sistemde olduğu bilgisi sızmasın diye.',
  })
  @ApiZodBody(EmailCodeRequestDto)
  @ApiZodResponse(202, AcceptedDto)
  @ApiErrorResponse(429, [ErrorCode.RATE_LIMITED], 'Bekleme süresi dolmadan yeni kod istendi')
  async requestEmailCode(
    @Body() body: EmailCodeRequestDto,
    @Req() request: FastifyRequest,
  ): Promise<{ accepted: true }> {
    await this.auth.requestEmailCode(body.email, request.ip ?? null);
    return { accepted: true };
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'E-posta ile giriş: kodu doğrula',
    description: 'Doğrulama başarılıysa kullanıcı yoksa oluşturulur ve oturum açılır.',
  })
  @ApiZodBody(EmailCodeVerifyDto)
  @ApiZodResponse(200, AuthResultDto)
  @ApiErrorResponse(401, [ErrorCode.OTP_INVALID, ErrorCode.OTP_EXPIRED])
  @ApiErrorResponse(429, [ErrorCode.OTP_TOO_MANY_ATTEMPTS])
  async verifyEmailCode(
    @Body() body: EmailCodeVerifyDto,
    @Req() request: FastifyRequest,
  ): Promise<AuthResultResponse> {
    return present(await this.auth.verifyEmailCode(body.email, body.code, contextOf(request)));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Oturumu yenile',
    description:
      'Refresh token her kullanımda döner (rotasyon). Aynı token ikinci kez gelirse ' +
      'çalınmış sayılır ve o cihazın tüm oturum zinciri iptal edilir.',
  })
  @ApiZodBody(RefreshDto)
  @ApiZodResponse(200, SessionDto)
  @ApiErrorResponse(401, [ErrorCode.REFRESH_TOKEN_INVALID, ErrorCode.REFRESH_TOKEN_REUSED])
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: FastifyRequest,
  ): Promise<SessionResponse> {
    return presentSession(await this.auth.refresh(body.refreshToken, contextOf(request)));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Çıkış',
    description: 'Yalnızca bu cihazın oturum zinciri iptal edilir. Bilinmeyen token da 204 döner.',
  })
  @ApiZodBody(LogoutDto)
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}

type SessionResponse = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

type AuthResultResponse = {
  session: SessionResponse;
  userId: string;
  isNewUser: boolean;
  onboardingCompleted: boolean;
};

function presentSession(session: IssuedSession): SessionResponse {
  return {
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
  };
}

function present(result: AuthResult): AuthResultResponse {
  return {
    session: presentSession(result.session),
    userId: result.user.id,
    isNewUser: result.isNewUser,
    onboardingCompleted: result.user.onboardingCompletedAt !== null,
  };
}

function contextOf(request: FastifyRequest): SessionContext {
  return {
    userAgent: request.headers['user-agent'] ?? null,
    deviceLabel: null,
  };
}
