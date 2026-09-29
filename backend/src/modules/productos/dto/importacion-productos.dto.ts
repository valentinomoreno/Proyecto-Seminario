import { IsString, Length } from 'class-validator';

export class ConfirmarImportacionProductosDto {
  @IsString()
  @Length(64, 64)
  token: string;
}
