import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { MovimientoCtaCorriente } from './movimiento-cta-corriente.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('cuentas_corrientes')
@Check('CHK_cuenta_saldo_no_negativo', '"saldo" >= 0')
@Check('CHK_cuenta_saldo_favor_no_negativo', '"saldo_favor" >= 0')
@Check('CHK_cuenta_limite_no_negativo', '"limite_credito" >= 0')
export class CuentaCorriente {
  @PrimaryGeneratedColumn({ name: 'id_cuenta_corriente' })
  idCuentaCorriente: number;

  @Column({ name: 'numero_cuenta', type: 'varchar', length: 20, unique: true })
  numeroCuenta: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  saldo: number;

  @Column({ name: 'saldo_favor', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  saldoFavor: number;

  @Column({ name: 'limite_credito', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  limiteCredito: number;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'fecha_alta', type: 'timestamptz' })
  fechaAlta: Date;

  @Column({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToOne(() => Cliente, (cliente) => cliente.cuentaCorriente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @OneToMany(() => MovimientoCtaCorriente, (movimiento) => movimiento.cuentaCorriente)
  movimientos: MovimientoCtaCorriente[];
}
