import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateCuentaCorrienteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId: number;
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
