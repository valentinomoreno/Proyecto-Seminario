import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ExportarSugeridoCompraDto } from '../dto/sugerido-compra.dto';
import { AlertasStockService } from '../services/alertas-stock.service';

@Controller('stock/alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(NombreRol.ADMINISTRADOR)
export class AlertasStockController {
  constructor(private readonly service: AlertasStockService) {}

  @Get()
  evaluar() {
    return this.service.evaluar();
  }

  @Post('exportar')
  async exportar(@Body() dto: ExportarSugeridoCompraDto, @Res() response: Response): Promise<void> {
    const archivo = await this.service.exportar(dto);
    const fecha = new Date().toISOString().slice(0, 10);
    response.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sugerido-compra-${fecha}.xlsx"`,
      'Content-Length': String(archivo.length),
    });
    response.send(archivo);
  }
}
