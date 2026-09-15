import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { TipoMovimientoStock } from '../enums/tipo-movimiento-stock.enum';
import { Venta } from './venta.entity';

@Entity('movimientos_stock')
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
}
