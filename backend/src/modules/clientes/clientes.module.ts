import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesController } from './controllers/clientes.controller';
import { CondicionesIvaController } from './controllers/condiciones-iva.controller';
import { ClienteEmpresa } from './entities/cliente-empresa.entity';
import { ClientePersona } from './entities/cliente-persona.entity';
import { Cliente } from './entities/cliente.entity';
import { CondicionIva } from './entities/condicion-iva.entity';
import { CLIENTES_REPOSITORY } from './repositories/interfaces/clientes-repository.interface';
import { CONDICIONES_IVA_REPOSITORY } from './repositories/interfaces/condiciones-iva-repository.interface';
import { TypeOrmClientesRepository } from './repositories/typeorm-clientes.repository';
import { TypeOrmCondicionesIvaRepository } from './repositories/typeorm-condiciones-iva.repository';
import { ClientesService } from './services/clientes.service';
import { CondicionesIvaService } from './services/condiciones-iva.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, ClientePersona, ClienteEmpresa, CondicionIva])],
  controllers: [ClientesController, CondicionesIvaController],
  providers: [
    { provide: CLIENTES_REPOSITORY, useClass: TypeOrmClientesRepository },
    { provide: CONDICIONES_IVA_REPOSITORY, useClass: TypeOrmCondicionesIvaRepository },
    ClientesService,
    CondicionesIvaService,
  ],
  exports: [CLIENTES_REPOSITORY, CONDICIONES_IVA_REPOSITORY, ClientesService],
})
export class ClientesModule {}
