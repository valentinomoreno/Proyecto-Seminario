import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateDevolucionDto {
  @IsInt()
  @IsPositive()
  idVentaDetalle: number;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;

  @IsBoolean()
  aptoReingreso: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}

export class QueryDevolucionesDto {
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
