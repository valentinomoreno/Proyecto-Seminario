import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/database/decimal.transformer';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { MovimientoCtaCte } from './movimiento-cta-cte.entity';

@Entity('cuentas_corrientes')
export class CuentaCorriente {
  @PrimaryGeneratedColumn({ name: 'id_cuenta_corriente' })
  idCuentaCorriente: number;

  @OneToOne(() => Cliente, (cliente) => cliente.cuentaCorriente, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  saldo: number;

  @Column({ name: 'fecha_ultimo_movimiento', type: 'timestamptz', nullable: true })
  fechaUltimoMovimiento: Date | null;

  @OneToMany(() => MovimientoCtaCte, (movimiento) => movimiento.cuentaCorriente)
  movimientos: MovimientoCtaCte[];
}
