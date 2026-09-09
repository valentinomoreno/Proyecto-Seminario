import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsPositive, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateVentaItemDto {
  @IsInt()
  @IsPositive()
  idProducto: number;

  @IsInt()
  @IsPositive()
  cantidad: number;
}

export class CreateVentaDto {
  @IsInt()
  @IsPositive()
  idCliente: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'La venta debe incluir al menos un ítem.' })
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items: CreateVentaItemDto[];
}

export class QueryVentasDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  comprobante?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  idCliente?: number;

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
