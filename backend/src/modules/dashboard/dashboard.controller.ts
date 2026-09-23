import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { NombreRol } from '../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(NombreRol.ADMINISTRADOR)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  obtener() {
    return this.service.obtener();
  }
}
