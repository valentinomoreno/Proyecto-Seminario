import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { TipoMovimientoStock } from '../enums/tipo-movimiento-stock.enum';
import { Venta } from './venta.entity';

@Entity('movimientos_stock')
@Check('CHK_movimiento_stock_cantidad', '"cantidad" > 0')
@Check('CHK_movimiento_stock_saldos', '"stock_anterior" >= 0 AND "stock_posterior" >= 0')
@Index('IDX_mov_stock_producto_fecha', ['producto', 'fecha'])
export class MovimientoStock {
  @PrimaryGeneratedColumn({ name: 'id_movimiento_stock' })
  idMovimientoStock: number;

  @ManyToOne(() => Producto, { nullable: false, eager: true })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  @ManyToOne(() => Usuario, { nullable: false, eager: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Venta, (v) => v.movimientosStock, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_venta' })
  venta?: Venta | null;

  @Column({
    type: 'enum',
    enum: TipoMovimientoStock,
    enumName: 'tipo_movimiento_stock_enum',
  })
  tipo: TipoMovimientoStock;

  @Column({ type: 'integer' })
  cantidad: number;

  @Column({ name: 'stock_anterior', type: 'integer' })
  stockAnterior: number;

  @Column({ name: 'stock_posterior', type: 'integer' })
  stockPosterior: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', length: 200 })
  motivo: string;

  @Column({ name: 'id_devolucion', type: 'integer', nullable: true })
  idDevolucion: number | null;
}
