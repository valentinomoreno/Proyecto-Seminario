import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Persona } from '../../usuarios/entities/persona.entity';
import { Cliente } from './cliente.entity';

@Entity('clientes_persona')
export class ClientePersona {
  @PrimaryGeneratedColumn({ name: 'id_cliente_persona' })
  idClientePersona: number;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'varchar', length: 80 })
  apellido: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  dni: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  cuil: string;

  @OneToOne(() => Cliente, (cliente) => cliente.persona, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  @OneToOne(() => Persona, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_persona' })
  personaRegistro: Persona;
}
