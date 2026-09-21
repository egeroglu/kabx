import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppConfig } from '../../common/config/app-config.js';
import { getRootLogger } from '../../common/logging/logger.js';
import { EmailModule } from '../email/email.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  APPLE_IDENTITY_PROVIDER,
  GOOGLE_IDENTITY_PROVIDER,
  type IdentityProvider,
} from './identity/identity-provider.js';
import { MockIdentityProvider } from './identity/mock.provider.js';
import { APPLE_OIDC, GOOGLE_OIDC, OidcIdentityProvider } from './identity/oidc.provider.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { OtpService } from './otp.service.js';
import { TokenService } from './token.service.js';

function identityProviderFactory(
  provider: 'apple' | 'google',
  config: AppConfig,
): IdentityProvider {
  if (config.get('IDENTITY_PROVIDER_MODE') !== 'live') {
    getRootLogger().warn({ provider }, 'kimlik sağlayıcısı MOCK modda — production için değil');
    return new MockIdentityProvider(provider);
  }

  const oidc = provider === 'apple' ? APPLE_OIDC : GOOGLE_OIDC;
  const audiences =
    provider === 'apple' ? config.get('APPLE_CLIENT_IDS') : config.get('GOOGLE_CLIENT_IDS');

  return new OidcIdentityProvider({
    provider,
    jwksUri: oidc.jwksUri,
    issuers: [...oidc.issuers],
    audiences,
  });
}

@Global()
@Module({
  imports: [EmailModule],
  controllers: [AuthController],
  providers: [
    TokenService,
    OtpService,
    AuthService,
    {
      provide: APPLE_IDENTITY_PROVIDER,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => identityProviderFactory('apple', config),
    },
    {
      provide: GOOGLE_IDENTITY_PROVIDER,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => identityProviderFactory('google', config),
    },
    // Guard'lar GLOBAL: yeni bir uç eklerken korumayı eklemeyi unutmak
    // sessizce veri sızdırmasın. Açık uçlar @Public() ile işaretlenir.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TokenService, OtpService, AuthService],
})
export class AuthModule {}
