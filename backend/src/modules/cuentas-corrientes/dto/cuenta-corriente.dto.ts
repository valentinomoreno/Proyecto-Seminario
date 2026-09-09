import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class RegistrarPagoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observaciones?: string;
}
