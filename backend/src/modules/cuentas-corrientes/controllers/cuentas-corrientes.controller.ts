import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CreateCuentaCorrienteDto, QueryCuentasCorrientesDto, RegistrarPagoDto } from '../dto/cuenta-corriente.dto';
import { CuentasCorrientesService } from '../services/cuentas-corrientes.service';

const ROLES_OPERATIVOS = [NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA];

@Controller('cuentas-corrientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CuentasCorrientesController {
  constructor(private readonly service: CuentasCorrientesService) {}

  @Get()
  @Roles(...ROLES_OPERATIVOS)
  findAll(@Query() query: QueryCuentasCorrientesDto) { return this.service.findAll(query); }

  @Get('cliente/:idCliente/historial')
  @Roles(...ROLES_OPERATIVOS)
  findHistorial(@Param('idCliente', ParseIntPipe) idCliente: number) {
    return this.service.findHistorialByCliente(idCliente);
  }

  @Post()
  @Roles(...ROLES_OPERATIVOS)
  create(@Body() dto: CreateCuentaCorrienteDto) { return this.service.create(dto); }

  /** El registro manual de pagos es exclusivo de administradores. */
  @Post('cliente/:idCliente/pagos')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  registrarPago(
    @Param('idCliente', ParseIntPipe) idCliente: number,
    @Body() dto: RegistrarPagoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.registrarPago(idCliente, dto, usuario.idEmpleado);
  }

  @Delete(':id')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
