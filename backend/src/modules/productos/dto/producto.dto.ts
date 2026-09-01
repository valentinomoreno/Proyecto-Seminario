import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion: string;

  @IsInt()
  @Min(0)
  stock: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioUnitario: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo?: number | null;

  @IsInt()
  @IsPositive()
  categoriaId: number;

  @IsInt()
  @IsPositive()
  marcaId: number;

  @IsInt()
  @IsPositive()
  estanteId: number;
}

export class UpdateProductoDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(50) sku?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) nombre?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() precioUnitario?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) costo?: number | null;
  @IsOptional() @IsInt() @IsPositive() categoriaId?: number;
  @IsOptional() @IsInt() @IsPositive() marcaId?: number;
  @IsOptional() @IsInt() @IsPositive() estanteId?: number;
}

export class QueryProductosDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  buscar?: string;

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
