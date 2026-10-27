import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class ItemOrdenDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProducto: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CrearOrdenDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCliente: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenDto)
  items: ItemOrdenDto[];
}
