import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CreateVentaDto } from '../dto/create-venta.dto';
import { QueryVentasDto } from '../dto/query-ventas.dto';
import { VentasService } from '../services/ventas.service';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Get()
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  findAll(@Query() query: QueryVentasDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  create(@Req() req: Request, @Body() dto: CreateVentaDto) {
    const usuario = req.user as UsuarioAutenticado;
    return this.service.registrarVenta(usuario.idUsuario, dto);
  }
}
