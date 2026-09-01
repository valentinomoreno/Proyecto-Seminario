import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  contrasena: string;
}

