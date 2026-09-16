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
import { Venta } from '../../ventas/entities/venta.entity';
import { TipoMovimientoCtaCorriente } from '../enums/tipo-movimiento-cta-corriente.enum';
import { CuentaCorriente } from './cuenta-corriente.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('movimientos_cta_cte')
@Check('CHK_mov_cta_monto', '"monto" > 0')
@Check('CHK_mov_cta_saldo', '"saldo_posterior" >= 0')
@Check('CHK_mov_cta_saldo_favor', '"saldo_favor_posterior" >= 0')
@Index('IDX_mov_cta_cuenta_fecha', ['cuentaCorriente', 'fecha'])
export class MovimientoCtaCorriente {
  @PrimaryGeneratedColumn({ name: 'id_movimiento_cta_cte' })
  idMovimientoCtaCte: number;

  @ManyToOne(() => CuentaCorriente, (cuenta) => cuenta.movimientos, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_cuenta_corriente' })
  cuentaCorriente: CuentaCorriente;

  @ManyToOne(() => Venta, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_venta' })
  venta: Venta | null;

  @Column({ type: 'enum', enum: TipoMovimientoCtaCorriente, enumName: 'tipo_movimiento_cta_cte_enum' })
  tipo: TipoMovimientoCtaCorriente;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  monto: number;

  @Column({ name: 'saldo_posterior', type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  saldoPosterior: number;

  @Column({ name: 'saldo_favor_posterior', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  saldoFavorPosterior: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;
}
