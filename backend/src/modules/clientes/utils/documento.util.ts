import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function normalizarDocumento(value: unknown): unknown {
  return typeof value === 'string' ? value.replace(/[.\s-]/g, '') : value;
}

export function esIdentificadorFiscalArgentinoValido(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
  const remainder = 11 - (sum % 11);
  const expectedDigit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  return Number(value[10]) === expectedDigit;
}

export function IsIdentificadorFiscalArgentino(
  nombre: 'CUIL' | 'CUIT',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isIdentificadorFiscalArgentino',
      target: object.constructor,
      propertyName,
      constraints: [nombre],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && esIdentificadorFiscalArgentinoValido(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `El ${String(args.constraints[0])} ingresado no es válido.`;
        },
      },
    });
  };
}
