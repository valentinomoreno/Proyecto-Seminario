import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  puntoPedido?: number = 0;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioUnitario: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioCosto?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string | null;

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
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) nombre?: string;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string | null;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsInt() @Min(0) stockMinimo?: number;
  @IsOptional() @IsInt() @Min(0) puntoPedido?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() precioUnitario?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) precioCosto?: number | null;
  @IsOptional() @IsString() @MaxLength(255) imagenUrl?: string | null;
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
