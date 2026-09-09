import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { RegistrarPagoDto } from '../dto/cuenta-corriente.dto';
import { CuentasCorrientesService } from '../services/cuentas-corrientes.service';

@Controller('cuentas-corrientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CuentasCorrientesController {
  constructor(private readonly service: CuentasCorrientesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':idCliente')
  findByCliente(@Param('idCliente', ParseIntPipe) idCliente: number) {
    return this.service.findByCliente(idCliente);
  }

  @Post(':idCliente/pagos')
  @Roles(NombreRol.ADMINISTRADOR)
  registrarPago(
    @Param('idCliente', ParseIntPipe) idCliente: number,
    @Body() dto: RegistrarPagoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.registrarPago(idCliente, dto, usuario.idEmpleado);
  }
}
