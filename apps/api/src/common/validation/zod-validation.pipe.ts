import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import { ZodError } from 'zod';

import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { isZodDto } from './zod-dto.js';
import { zodIssuesToDetails } from './zod-issues.js';

/**
 * Global pipe: metatype bir Zod DTO ise gövdeyi/sorguyu/parametreyi doğrular ve
 * ayrıştırılmış (dönüştürülmüş) değeri döner. Zod DTO değilse dokunmaz.
 *
 * Bilinmeyen alanlar Zod'un varsayılanına göre düşer — şemalarda açıkça
 * `.strict()` kullanılırsa hata verir.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype;
    if (!isZodDto(metatype)) return value;

    try {
      return metatype.zodSchema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw AppException.badRequest(ErrorCode.VALIDATION_FAILED, 'Request validation failed', {
          target: metadata.type,
          issues: zodIssuesToDetails(error),
        });
      }
      throw error;
    }
  }
}
