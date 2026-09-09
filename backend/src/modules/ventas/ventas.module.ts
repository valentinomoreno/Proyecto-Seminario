import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './controllers/ventas.controller';
import { Venta } from './entities/venta.entity';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { VENTAS_REPOSITORY } from './repositories/interfaces/ventas-repository.interface';
import { TypeOrmVentasRepository } from './repositories/typeorm-ventas.repository';
import { VentasService } from './services/ventas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, VentaDetalle])],
  controllers: [VentasController],
  providers: [
    VentasService,
    {
      provide: VENTAS_REPOSITORY,
      useClass: TypeOrmVentasRepository,
    },
  ],
  exports: [VentasService, VENTAS_REPOSITORY],
})
export class VentasModule {}
