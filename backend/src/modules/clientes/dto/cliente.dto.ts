import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsIdentificadorFiscalArgentino, normalizarDocumento } from '../utils/documento.util';

function trimOptional({ value }: { value: unknown }): unknown {
  if (value === null || value === undefined) return value;
  return typeof value === 'string' ? value.trim() || null : value;
}

function trimRequired({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

class ContactoClienteDto {
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(40)
  telefono?: string | null;

  @IsOptional()
  @Transform(trimOptional)
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @MaxLength(160)
  correo?: string | null;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  direccion?: string | null;
}

class CreateClienteDto extends ContactoClienteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  condicionIvaId: number;

  @IsOptional()
  @IsBoolean()
  cuentaCorrienteHabilitada?: boolean = false;

  @ValidateIf((dto: CreateClienteDto) => Boolean(dto.cuentaCorrienteHabilitada))
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  limiteCredito?: number;
}

export class CreateClientePersonaDto extends CreateClienteDto {
  @Transform(trimRequired)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @Transform(trimRequired)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellido: string;

  @Transform(({ value }) => normalizarDocumento(value))
  @IsString()
  @Matches(/^\d{7,8}$/, { message: 'El DNI debe contener 7 u 8 dígitos.' })
  dni: string;

  @Transform(({ value }) => normalizarDocumento(value))
  @IsString()
  @IsIdentificadorFiscalArgentino('CUIL')
  cuil: string;
}

export class CreateClienteEmpresaDto extends CreateClienteDto {
  @Transform(({ value }) => normalizarDocumento(value))
  @IsString()
  @IsIdentificadorFiscalArgentino('CUIT')
  cuit: string;

  @Transform(trimRequired)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  razonSocial: string;

  @Transform(trimRequired)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  personaContacto: string;
}

export class UpdateClienteDto extends ContactoClienteDto {}

export class QueryClientesDto {
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
