import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from './cliente.entity';
import { MovimientoCtaCorriente } from './movimiento-cta-corriente.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('cuentas_corrientes')
export class CuentaCorriente {
  @PrimaryGeneratedColumn({ name: 'id_cuenta_corriente' })
  idCuentaCorriente: number;

  @OneToOne(() => Cliente, (cliente) => cliente.cuentaCorriente, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  saldo: number;

  @Column({
    name: 'limite_credito',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  limiteCredito: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => MovimientoCtaCorriente, (mov) => mov.cuentaCorriente)
  movimientos: MovimientoCtaCorriente[];
}
