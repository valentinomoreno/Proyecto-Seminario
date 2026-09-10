import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CondicionesIvaService } from '../services/condiciones-iva.service';

@Controller('condiciones-iva')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
export class CondicionesIvaController {
  constructor(private readonly service: CondicionesIvaService) {}

  @Get()
  findAll() { return this.service.findAll(); }
}
