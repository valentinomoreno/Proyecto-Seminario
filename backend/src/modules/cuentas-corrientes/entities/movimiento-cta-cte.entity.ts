import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/database/decimal.transformer';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { TipoMovimientoCtaCte } from '../enums/tipo-movimiento-cta-cte.enum';
import { CuentaCorriente } from './cuenta-corriente.entity';

/**
 * `monto` lleva signo: positivo aumenta la deuda (IMPUTACION_VENTA, MORA),
 * negativo la reduce (PAGO, NOTA_CREDITO). Así SUM(monto) reconstruye el saldo.
 */
@Entity('movimientos_cta_cte')
@Check('CHK_movimiento_cta_cte_monto', '"monto" <> 0')
export class MovimientoCtaCte {
  @PrimaryGeneratedColumn({ name: 'id_movimiento_cta_cte' })
  idMovimientoCtaCte: number;

  @ManyToOne(() => CuentaCorriente, (cuenta) => cuenta.movimientos, { nullable: false })
  @JoinColumn({ name: 'id_cuenta_corriente' })
  cuentaCorriente: CuentaCorriente;

  @Index()
  @Column({ type: 'enum', enum: TipoMovimientoCtaCte })
  tipo: TipoMovimientoCtaCte;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  monto: number;

  @Column({ name: 'saldo_resultante', type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  saldoResultante: number;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ name: 'id_venta', type: 'integer', nullable: true })
  idVenta: number | null;

  @ManyToOne(() => Empleado, { nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  empleado: Empleado | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observaciones: string | null;
}
