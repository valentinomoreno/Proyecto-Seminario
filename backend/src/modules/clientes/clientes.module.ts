import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../usuarios/entities/persona.entity';
import { ClientesController } from './controllers/clientes.controller';
import { Cliente } from './entities/cliente.entity';
import { CuentaCorriente } from './entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from './entities/movimiento-cta-corriente.entity';
import { CLIENTES_REPOSITORY } from './repositories/interfaces/clientes-repository.interface';
import { TypeOrmClientesRepository } from './repositories/typeorm-clientes.repository';
import { ClientesService } from './services/clientes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cliente,
      CuentaCorriente,
      MovimientoCtaCorriente,
      Persona,
    ]),
  ],
  controllers: [ClientesController],
  providers: [
    {
      provide: CLIENTES_REPOSITORY,
      useClass: TypeOrmClientesRepository,
    },
    ClientesService,
  ],
  exports: [ClientesService, CLIENTES_REPOSITORY],
})
export class ClientesModule {}
