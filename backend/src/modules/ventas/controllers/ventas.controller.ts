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
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CreateVentaDto } from '../dto/create-venta.dto';
import { QueryVentasDto } from '../dto/query-ventas.dto';
import { VentasService } from '../services/ventas.service';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Get()
  findAll(@Query() query: QueryVentasDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateVentaDto) {
    const usuario = req.user as UsuarioAutenticado;
    return this.service.registrarVenta(usuario.idUsuario, dto);
  }
}
