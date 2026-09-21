import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import { describe, expect, it } from 'vitest';

import { isZodDto } from '../../src/common/validation/zod-dto.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { UsersController } from '../../src/modules/users/users.controller.js';

/**
 * REGRESYON KORUMASI.
 *
 * `ZodValidationPipe` yalnızca parametrenin `design:paramtypes` metadata'sı bir
 * Zod DTO SINIFI olduğunda devreye girer. Parametreye `z.infer<typeof schema>`
 * gibi bir TİP yazılırsa TypeScript onu `Object` olarak yayar, pipe DTO'yu
 * tanımaz ve gövde HİÇ DOĞRULANMADAN servise geçer — sessizce, hata vermeden.
 *
 * Bu test her `@Body()` parametresinin gerçekten bir Zod DTO sınıfı olduğunu
 * doğrular. Yeni controller eklendiğinde aşağıdaki listeye eklenmelidir.
 */
const CONTROLLERS = [AuthController, UsersController];

type RouteArgMetadata = Record<string, { index: number }>;

function bodyParamTypes(controller: new (...args: never[]) => unknown): {
  method: string;
  index: number;
  paramType: unknown;
}[] {
  const found: { method: string; index: number; paramType: unknown }[] = [];
  const prototype = controller.prototype as object;

  for (const method of Object.getOwnPropertyNames(prototype)) {
    if (method === 'constructor') continue;

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method) as
      RouteArgMetadata | undefined;
    if (!args) continue;

    const paramTypes =
      (Reflect.getMetadata('design:paramtypes', prototype, method) as unknown[] | undefined) ?? [];

    for (const [key, value] of Object.entries(args)) {
      // Anahtar biçimi: `<RouteParamtypes>:<index>`
      if (!key.startsWith(`${RouteParamtypes.BODY}:`)) continue;
      found.push({ method, index: value.index, paramType: paramTypes[value.index] });
    }
  }
  return found;
}

describe('controller gövde doğrulaması', () => {
  for (const controller of CONTROLLERS) {
    describe(controller.name, () => {
      const bodies = bodyParamTypes(controller);

      it('en az bir @Body() parametresi bulunuyor (test gerçekten bir şey tarıyor)', () => {
        expect(bodies.length).toBeGreaterThan(0);
      });

      for (const body of bodies) {
        it(`${body.method}() gövdesi Zod DTO sınıfı — doğrulama çalışıyor`, () => {
          expect(
            isZodDto(body.paramType),
            `${controller.name}.${body.method}() içindeki @Body() parametresinin tipi bir Zod DTO ` +
              'sınıfı değil. `z.infer<typeof schema>` yazılmış olabilir; bu doğrulamayı sessizce ' +
              'devre dışı bırakır. Parametre tipini DTO sınıfının kendisi yap.',
          ).toBe(true);
        });
      }
    });
  }
});
