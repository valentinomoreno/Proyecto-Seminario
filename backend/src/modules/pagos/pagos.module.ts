import { Module } from '@nestjs/common';
import { VentasModule } from '../ventas/ventas.module';
import { MercadoPagoClient } from './mercado-pago.client';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [VentasModule],
  controllers: [PagosController],
  providers: [MercadoPagoClient, PagosService],
})
export class PagosModule {}
