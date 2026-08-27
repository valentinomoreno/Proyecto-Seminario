import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  descripcion?: string;
}

export class UpdateCategoriaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  descripcion?: string;
}

export class CreateMarcaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;
}

export class UpdateMarcaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre?: string;
}

export class CreateDepositoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  direccion?: string;
}

export class UpdateDepositoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  direccion?: string;
}

export class CreateSectorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @IsInt()
  @IsPositive()
  depositoId: number;
}

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  depositoId?: number;
}

export class CreateEstanteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  descripcion?: string;

  @IsInt()
  @IsPositive()
  sectorId: number;
}

export class UpdateEstanteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sectorId?: number;
}
