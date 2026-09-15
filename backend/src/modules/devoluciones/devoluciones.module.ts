import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevolucionesController } from './controllers/devoluciones.controller';
import { Devolucion } from './entities/devolucion.entity';
import { NotaCredito } from './entities/nota-credito.entity';
import { DEVOLUCIONES_REPOSITORY } from './repositories/interfaces/devoluciones-repository.interface';
import { TypeOrmDevolucionesRepository } from './repositories/typeorm-devoluciones.repository';
import { DevolucionesService } from './services/devoluciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Devolucion, NotaCredito])],
  controllers: [DevolucionesController],
  providers: [
    DevolucionesService,
    {
      provide: DEVOLUCIONES_REPOSITORY,
      useClass: TypeOrmDevolucionesRepository,
    },
  ],
  exports: [DevolucionesService, DEVOLUCIONES_REPOSITORY],
})
export class DevolucionesModule {}
