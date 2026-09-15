import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MetodoCobro } from '../enums/metodo-cobro.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';

export class ItemVentaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProducto: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreateVentaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCliente: number;

  @IsEnum(ModalidadPago)
  modalidadPago: ModalidadPago;

  @ValidateIf((o: CreateVentaDto) => o.modalidadPago === ModalidadPago.CONTADO)
  @IsEnum(MetodoCobro)
  metodoCobro?: MetodoCobro;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenciaPago?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un producto en la venta.' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
