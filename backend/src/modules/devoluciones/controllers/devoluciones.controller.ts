import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CreateDevolucionDto, QueryDevolucionesDto } from '../dto/devolucion.dto';
import { DevolucionesService } from '../services/devoluciones.service';

@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  constructor(private readonly service: DevolucionesService) {}

  @Get()
  findAll(@Query() query: QueryDevolucionesDto) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  create(@Body() dto: CreateDevolucionDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.create(dto, usuario);
  }
}
