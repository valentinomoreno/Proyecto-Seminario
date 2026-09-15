import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesModule } from '../clientes/clientes.module';
import { Producto } from '../productos/entities/producto.entity';
import { VentasController } from './controllers/ventas.controller';
import { Cobro } from './entities/cobro.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { Factura } from './entities/factura.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { Venta } from './entities/venta.entity';
import { VENTAS_REPOSITORY } from './repositories/interfaces/ventas-repository.interface';
import { TypeOrmVentasRepository } from './repositories/typeorm-ventas.repository';
import { VentasService } from './services/ventas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      DetalleVenta,
      MovimientoStock,
      Cobro,
      Factura,
      Producto,
    ]),
    ClientesModule,
  ],
  controllers: [VentasController],
  providers: [
    {
      provide: VENTAS_REPOSITORY,
      useClass: TypeOrmVentasRepository,
    },
    VentasService,
  ],
  exports: [VentasService, VENTAS_REPOSITORY],
})
export class VentasModule {}
