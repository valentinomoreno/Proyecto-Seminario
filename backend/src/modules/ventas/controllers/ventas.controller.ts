import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CreateVentaDto, QueryVentasDto } from '../dto/venta.dto';
import { VentasService } from '../services/ventas.service';

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Get()
  findAll(@Query() query: QueryVentasDto) { return this.service.findAll(query); }

  @Get('comprobante/:numeroComprobante')
  findByComprobante(@Param('numeroComprobante') numeroComprobante: string) {
    return this.service.findByComprobante(numeroComprobante);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  create(@Body() dto: CreateVentaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.create(dto, usuario);
  }
}
