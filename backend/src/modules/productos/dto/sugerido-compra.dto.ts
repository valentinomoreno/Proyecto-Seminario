import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class ItemSugeridoCompraDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProducto: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class ExportarSugeridoCompraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemSugeridoCompraDto)
  items: ItemSugeridoCompraDto[];
}
