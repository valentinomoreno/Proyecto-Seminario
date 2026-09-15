import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MetodoCobro } from '../enums/metodo-cobro.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';

export class ItemVentaDto {
  @IsInt()
  @Min(1)
  idProducto: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreateVentaDto {
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
  referenciaPago?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un producto en la venta.' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
