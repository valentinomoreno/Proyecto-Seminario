import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AvisosCobroService } from '../services/avisos-cobro.service';
import { MoraService } from '../services/mora.service';

/**
 * Disparadores manuales de los procesos programados: permiten demostrar el sprint
 * sin esperar al día real del calendario. Sólo administradores.
 */
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(
    private readonly moraService: MoraService,
    private readonly avisosCobroService: AvisosCobroService,
  ) {}

  @Post('mora/ejecutar-ahora')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  ejecutarMora() {
    return this.moraService.ejecutar();
  }

  @Post('avisos-cobro/ejecutar-ahora')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  ejecutarAvisosCobro() {
    return this.avisosCobroService.ejecutar();
  }
}
