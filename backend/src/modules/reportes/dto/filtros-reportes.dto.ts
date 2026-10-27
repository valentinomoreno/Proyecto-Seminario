import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class FiltrosReportesDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;
}

export class FiltrosRankingDto extends FiltrosReportesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCategoria?: number;
}
