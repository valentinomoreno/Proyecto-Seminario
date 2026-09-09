import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCorriente } from '../cuentas-corrientes/entities/cuenta-corriente.entity';
import { ClientesController } from './controllers/clientes.controller';
import { Cliente } from './entities/cliente.entity';
import { CLIENTES_REPOSITORY } from './repositories/interfaces/clientes-repository.interface';
import { TypeOrmClientesRepository } from './repositories/typeorm-clientes.repository';
import { ClientesService } from './services/clientes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, CuentaCorriente])],
  controllers: [ClientesController],
  providers: [
    // Repositories wired via interface injection tokens (DIP)
    {
      provide: CLIENTES_REPOSITORY,
      useClass: TypeOrmClientesRepository,
    },
    // Services
    ClientesService,
  ],
  exports: [ClientesService, CLIENTES_REPOSITORY],
})
export class ClientesModule {}
