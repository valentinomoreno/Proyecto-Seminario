import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { CondicionIva } from '../enums/condicion-iva.enum';

export class CreateClienteDto {
  @IsString()
  @Length(2, 80)
  nombre: string;

  @IsString()
  @Length(2, 80)
  apellido: string;

  @IsString()
  @Length(11, 11)
  cuil: string;

  @IsString()
  @Length(7, 8)
  dni: string;

  @IsEnum(CondicionIva)
  condicionIva: CondicionIva;

  @IsOptional()
  @IsBoolean()
  cuentaCorrienteHabilitada?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limiteCredito?: number;
}
