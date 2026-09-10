import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateCuentaCorrienteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId: number;
}

/** Pago manual imputado sobre la cuenta corriente del cliente (exclusivo de administradores). */
export class RegistrarPagoDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observaciones?: string;
}

export class QueryCuentasCorrientesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;
}
