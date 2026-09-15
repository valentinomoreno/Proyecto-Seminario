import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesModule } from '../clientes/clientes.module';
import { CuentasCorrientesController } from './controllers/cuentas-corrientes.controller';
import { CuentaCorriente } from './entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from './entities/movimiento-cta-corriente.entity';
import { CUENTAS_CORRIENTES_REPOSITORY } from './repositories/interfaces/cuentas-corrientes-repository.interface';
import { TypeOrmCuentasCorrientesRepository } from './repositories/typeorm-cuentas-corrientes.repository';
import { CuentasCorrientesService } from './services/cuentas-corrientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaCorriente, MovimientoCtaCorriente]), ClientesModule],
  controllers: [CuentasCorrientesController],
  providers: [
    { provide: CUENTAS_CORRIENTES_REPOSITORY, useClass: TypeOrmCuentasCorrientesRepository },
    CuentasCorrientesService,
  ],
  exports: [CuentasCorrientesService, CUENTAS_CORRIENTES_REPOSITORY],
})
export class CuentasCorrientesModule {}
