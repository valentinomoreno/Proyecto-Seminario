import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellido: string;

  @IsString()
  @Matches(/^\d{7,11}$/, { message: 'dniCuit debe contener entre 7 y 11 dígitos.' })
  dniCuit: string;

  @IsEmail({}, { message: 'El email no tiene un formato válido.' })
  @MaxLength(120)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string | null;
}

export class UpdateClienteDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) nombre?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) apellido?: string;
  @IsOptional() @IsString() @Matches(/^\d{7,11}$/, { message: 'dniCuit debe contener entre 7 y 11 dígitos.' }) dniCuit?: string;
  @IsOptional() @IsEmail({}, { message: 'El email no tiene un formato válido.' }) @MaxLength(120) email?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string | null;
}

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
