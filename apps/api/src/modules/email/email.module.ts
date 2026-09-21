import { Global, Module } from '@nestjs/common';

import { AppConfig } from '../../common/config/app-config.js';
import { getRootLogger } from '../../common/logging/logger.js';
import { EmailProvider } from './email-provider.js';
import { LogEmailProvider, ResendEmailProvider } from './resend.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: EmailProvider,
      inject: [AppConfig],
      useFactory: (config: AppConfig): EmailProvider => {
        if (config.get('EMAIL_PROVIDER') !== 'live') {
          return new LogEmailProvider();
        }

        const apiKey = config.get('RESEND_API_KEY');
        if (!apiKey) {
          // Sessizce mock'a düşmek production'da en kötü sonucu verir:
          // kimse OTP alamaz, hiç kimse giriş yapamaz ve log'da hata olmaz.
          // Bu yüzden süreç hiç ayağa kalkmasın.
          throw new Error(
            'EMAIL_PROVIDER=live ama RESEND_API_KEY boş. Anahtarı gir ya da EMAIL_PROVIDER=mock yap.',
          );
        }

        getRootLogger().info('E-posta sağlayıcısı: Resend');
        return new ResendEmailProvider(apiKey, config.get('EMAIL_FROM'));
      },
    },
  ],
  exports: [EmailProvider],
})
export class EmailModule {}
