import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { ClienteEmpresa } from './cliente-empresa.entity';
import { ClientePersona } from './cliente-persona.entity';
import { CondicionIva } from './condicion-iva.entity';

export enum TipoCliente {
  PERSONA = 'PERSONA',
  EMPRESA = 'EMPRESA',
}

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  idCliente: number;

  @Column({ type: 'enum', enum: TipoCliente })
  tipo: TipoCliente;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  correo: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string | null;

  @ManyToOne(() => CondicionIva, (condicionIva) => condicionIva.clientes, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_condicion_iva' })
  condicionIva: CondicionIva;

  @OneToOne(() => ClientePersona, (persona) => persona.cliente)
  persona: ClientePersona | null;

  @OneToOne(() => ClienteEmpresa, (empresa) => empresa.cliente)
  empresa: ClienteEmpresa | null;

  @OneToOne(() => CuentaCorriente, (cuentaCorriente) => cuentaCorriente.cliente)
  cuentaCorriente: CuentaCorriente | null;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;
}
