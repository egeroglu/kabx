import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'kabx:isPublic';

/**
 * JwtAuthGuard global olarak bağlı: varsayılan KAPALI, uçlar açıkça
 * `@Public()` ile açılır. Tersi (varsayılan açık) olsaydı yeni bir uç
 * eklerken guard eklemeyi unutmak sessizce veri sızdırırdı.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
