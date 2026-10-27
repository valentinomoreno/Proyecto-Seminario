import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { NombreRol } from '../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsuarioAutenticado } from '../../common/interfaces/usuario-autenticado.interface';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { PagosService } from './pagos.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post('mercado-pago/ordenes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  crear(@Body() dto: CrearOrdenDto, @Headers('idempotency-key') clave: string, @Req() req: Request) {
    return this.pagos.crear(dto, req.user as UsuarioAutenticado, clave);
  }

  @Get('mercado-pago/ordenes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  estado(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.pagos.estado(id, req.user as UsuarioAutenticado);
  }

  @Get('mercado-pago/ordenes/clave/:clave')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  estadoPorClave(@Param('clave', ParseUUIDPipe) clave: string, @Req() req: Request) {
    return this.pagos.estadoPorClave(clave, req.user as UsuarioAutenticado);
  }

  @Post('mercado-pago/ordenes/:id/cancelar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  cancelar(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.pagos.cancelar(id, req.user as UsuarioAutenticado);
  }

  @Post('mercado-pago/ordenes/:id/simular-acreditacion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  simularAcreditacion(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.pagos.simularAcreditacion(id, req.user as UsuarioAutenticado);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request, @Body() body: { id?: string; type?: string; data?: { id?: string } }) {
    const dataId = req.query['data.id'];
    const idOrden = typeof dataId === 'string' ? dataId : '';
    if (!this.pagos.validarFirma(idOrden, String(req.headers['x-signature'] ?? ''), String(req.headers['x-request-id'] ?? ''))) {
      throw new UnauthorizedException('Firma inválida.');
    }
    if (body?.type !== 'order' || body.data?.id !== idOrden || !body.id || !/^ORD[A-Za-z0-9]+$/.test(idOrden)) {
      throw new UnauthorizedException('Notificación inválida.');
    }
    await this.pagos.recibirWebhook(String(body.id), idOrden);
    return { recibido: true };
  }
}
