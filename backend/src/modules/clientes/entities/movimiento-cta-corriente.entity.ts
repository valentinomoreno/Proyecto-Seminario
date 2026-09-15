import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TipoMovimientoCtaCorriente } from '../enums/tipo-movimiento-cta-corriente.enum';
import { CuentaCorriente } from './cuenta-corriente.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('movimientos_cta_cte')
export class MovimientoCtaCorriente {
  @PrimaryGeneratedColumn({ name: 'id_movimiento_cta_cte' })
  idMovimientoCtaCte: number;

  @ManyToOne(() => CuentaCorriente, (cta) => cta.movimientos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cuenta_corriente' })
  cuentaCorriente: CuentaCorriente;

  @Column({ name: 'id_venta', type: 'integer', nullable: true })
  idVenta: number | null;

  @Column({
    type: 'enum',
    enum: TipoMovimientoCtaCorriente,
  })
  tipo: TipoMovimientoCtaCorriente;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  monto: number;

  @Column({
    name: 'saldo_posterior',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  saldoPosterior: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', length: 200 })
  descripcion: string;
}
