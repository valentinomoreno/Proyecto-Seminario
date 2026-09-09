import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('cuentas_corrientes')
export class CuentaCorriente {
  @PrimaryGeneratedColumn({ name: 'id_cuenta_corriente' })
  idCuentaCorriente: number;

  @Column({ name: 'numero_cuenta', type: 'varchar', length: 20, unique: true })
  numeroCuenta: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  saldo: number;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'fecha_alta', type: 'timestamptz' })
  fechaAlta: Date;

  @Column({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToOne(() => Cliente, (cliente) => cliente.cuentaCorriente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;
}
