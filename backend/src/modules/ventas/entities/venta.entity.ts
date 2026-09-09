import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/database/decimal.transformer';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { EstadoVenta } from '../enums/estado-venta.enum';
import { VentaDetalle } from './venta-detalle.entity';

@Entity('ventas')
@Check('CHK_venta_total', '"total" > 0')
export class Venta {
  @PrimaryGeneratedColumn({ name: 'id_venta' })
  idVenta: number;

  @Index({ unique: true })
  @Column({ name: 'numero_comprobante', type: 'varchar', length: 20 })
  numeroComprobante: string;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @ManyToOne(() => Empleado, { nullable: false })
  @JoinColumn({ name: 'id_empleado' })
  empleado: Empleado;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  total: number;

  @Column({ type: 'enum', enum: EstadoVenta, default: EstadoVenta.CONFIRMADA })
  estado: EstadoVenta;

  @OneToMany(() => VentaDetalle, (detalle) => detalle.venta, { cascade: ['insert'] })
  detalles: VentaDetalle[];
}
