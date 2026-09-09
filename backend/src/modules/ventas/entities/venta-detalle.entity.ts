import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/database/decimal.transformer';
import { Producto } from '../../productos/entities/producto.entity';
import { Venta } from './venta.entity';

@Entity('ventas_detalle')
@Check('CHK_venta_detalle_cantidad', '"cantidad" > 0')
@Check('CHK_venta_detalle_devuelta', '"cantidad_devuelta" >= 0 AND "cantidad_devuelta" <= "cantidad"')
export class VentaDetalle {
  @PrimaryGeneratedColumn({ name: 'id_venta_detalle' })
  idVentaDetalle: number;

  @ManyToOne(() => Venta, (venta) => venta.detalles, { nullable: false })
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  @Column({ type: 'integer' })
  cantidad: number;

  // Snapshot del precio al momento de la venta: el precio del producto puede cambiar después.
  @Column({ name: 'precio_unitario', type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  precioUnitario: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal: number;

  @Column({ name: 'cantidad_devuelta', type: 'integer', default: 0 })
  cantidadDevuelta: number;
}
