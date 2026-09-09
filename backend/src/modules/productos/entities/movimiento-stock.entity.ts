import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { TipoMovimientoStock } from '../enums/tipo-movimiento-stock.enum';
import { Producto } from './producto.entity';

@Entity('movimientos_stock')
@Check('CHK_movimiento_stock_cantidad', '"cantidad" > 0')
export class MovimientoStock {
  @PrimaryGeneratedColumn({ name: 'id_movimiento_stock' })
  idMovimientoStock: number;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  @Index()
  @Column({ type: 'enum', enum: TipoMovimientoStock })
  tipo: TipoMovimientoStock;

  // Siempre positiva: la dirección del movimiento la determina el campo `tipo`.
  @Column({ type: 'integer' })
  cantidad: number;

  // Snapshot del stock del producto DESPUÉS de aplicar el movimiento.
  @Column({ name: 'stock_resultante', type: 'integer' })
  stockResultante: number;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  // Columnas sueltas (sin relación TypeORM) para evitar dependencia circular entre módulos.
  @Column({ name: 'id_venta', type: 'integer', nullable: true })
  idVenta: number | null;

  // El FK real a `devoluciones` se agrega en una migración posterior (la tabla aún no existe).
  @Column({ name: 'id_devolucion', type: 'integer', nullable: true })
  idDevolucion: number | null;

  @ManyToOne(() => Empleado, { nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  empleado: Empleado | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
