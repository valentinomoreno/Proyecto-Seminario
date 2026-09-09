import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasCorrientesController } from './controllers/cuentas-corrientes.controller';
import { CuentaCorriente } from './entities/cuenta-corriente.entity';
import { MovimientoCtaCte } from './entities/movimiento-cta-cte.entity';
import { CUENTAS_CORRIENTES_REPOSITORY } from './repositories/interfaces/cuentas-corrientes-repository.interface';
import { MOVIMIENTOS_CTA_CTE_REPOSITORY } from './repositories/interfaces/movimientos-cta-cte-repository.interface';
import { TypeOrmCuentasCorrientesRepository } from './repositories/typeorm-cuentas-corrientes.repository';
import { TypeOrmMovimientosCtaCteRepository } from './repositories/typeorm-movimientos-cta-cte.repository';
import { CuentasCorrientesService } from './services/cuentas-corrientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaCorriente, MovimientoCtaCte])],
  controllers: [CuentasCorrientesController],
  providers: [
    // Repositories wired via interface injection tokens (DIP)
    {
      provide: CUENTAS_CORRIENTES_REPOSITORY,
      useClass: TypeOrmCuentasCorrientesRepository,
    },
    {
      provide: MOVIMIENTOS_CTA_CTE_REPOSITORY,
      useClass: TypeOrmMovimientosCtaCteRepository,
    },
    // Services
    CuentasCorrientesService,
  ],
  exports: [CuentasCorrientesService, CUENTAS_CORRIENTES_REPOSITORY, MOVIMIENTOS_CTA_CTE_REPOSITORY],
})
export class CuentasCorrientesModule {}
