import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Persona } from '../../usuarios/entities/persona.entity';
import { CondicionIva } from '../enums/condicion-iva.enum';
import { CuentaCorriente } from './cuenta-corriente.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  idCliente: number;

  @Column({
    name: 'condicion_iva',
    type: 'enum',
    enum: CondicionIva,
    default: CondicionIva.CONSUMIDOR_FINAL,
  })
  condicionIva: CondicionIva;

  @Column({ name: 'cuenta_corriente_habilitada', type: 'boolean', default: false })
  cuentaCorrienteHabilitada: boolean;

  @Column({
    name: 'limite_credito',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  limiteCredito: number;

  @OneToOne(() => Persona, { eager: true, cascade: true, nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  @OneToOne(() => CuentaCorriente, (cta) => cta.cliente)
  cuentaCorriente: CuentaCorriente;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;
}
