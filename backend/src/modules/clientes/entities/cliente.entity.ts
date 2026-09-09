import { Column, DeleteDateColumn, Entity, Index, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  idCliente: number;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'varchar', length: 80 })
  apellido: string;

  @Index({ unique: true })
  @Column({ name: 'dni_cuit', type: 'varchar', length: 11 })
  dniCuit: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ default: true })
  activo: boolean;

  @OneToOne(() => CuentaCorriente, (cuenta) => cuenta.cliente)
  cuentaCorriente: CuentaCorriente;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;
}
