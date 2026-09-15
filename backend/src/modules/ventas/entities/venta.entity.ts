import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { EstadoVenta } from '../enums/estado-venta.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';
import { Cobro } from './cobro.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { Factura } from './factura.entity';
import { MovimientoStock } from './movimiento-stock.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn({ name: 'id_venta' })
  idVenta: number;

  @Column({ name: 'numero_venta', type: 'varchar', length: 30, unique: true })
  numeroVenta: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  subtotal: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  iva: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  total: number;

  @Column({
    name: 'modalidad_pago',
    type: 'enum',
    enum: ModalidadPago,
  })
  modalidadPago: ModalidadPago;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
    default: EstadoVenta.COMPLETADA,
  })
  estado: EstadoVenta;

  @ManyToOne(() => Usuario, { nullable: false, eager: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Cliente, { nullable: false, eager: true })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @OneToMany(() => DetalleVenta, (det) => det.venta, { cascade: true, eager: true })
  detalles: DetalleVenta[];

  @OneToOne(() => Cobro, (cobro) => cobro.venta, { cascade: true, eager: true })
  cobro?: Cobro;

  @OneToOne(() => Factura, (factura) => factura.venta, { cascade: true, eager: true })
  factura?: Factura;

  @OneToMany(() => MovimientoStock, (mov) => mov.venta)
  movimientosStock: MovimientoStock[];
}
