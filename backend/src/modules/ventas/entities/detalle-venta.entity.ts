import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Venta } from './venta.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('detalles_venta')
@Check('CHK_detalle_cantidad', '"cantidad" > 0')
@Check('CHK_detalle_precio', '"precio_unitario" > 0')
@Check('CHK_detalle_subtotal', '"subtotal" > 0')
@Unique('UQ_detalle_venta_producto', ['venta', 'producto'])
@Index('IDX_detalles_producto', ['producto'])
export class DetalleVenta {
  @PrimaryGeneratedColumn({ name: 'id_detalle_venta' })
  idDetalleVenta: number;

  @ManyToOne(() => Venta, (venta) => venta.detalles, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;

  @ManyToOne(() => Producto, { nullable: false, eager: true })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  @Column({ type: 'integer' })
  cantidad: number;

  @Column({
    name: 'precio_unitario',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  precioUnitario: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  subtotal: number;

  @Column({ name: 'cantidad_devuelta', type: 'integer', default: 0 })
  cantidadDevuelta: number;
}
