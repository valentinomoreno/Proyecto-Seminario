import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { NombreRol } from '../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FiltrosRankingDto, FiltrosReportesDto } from './dto/filtros-reportes.dto';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(NombreRol.ADMINISTRADOR)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get('ventas-mensuales')
  ventasMensuales(@Query() filtros: FiltrosReportesDto) {
    return this.reportes.ventasMensuales(filtros);
  }

  @Get('ranking-productos')
  rankingProductos(@Query() filtros: FiltrosRankingDto) {
    return this.reportes.rankingProductos(filtros);
  }
}
