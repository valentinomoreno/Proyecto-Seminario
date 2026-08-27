import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Persona } from './persona.entity';
import { Usuario } from './usuario.entity';

@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  idEmpleado: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  legajo: string;

  @Column({ default: true })
  activo: boolean;

  @OneToOne(() => Persona, (persona) => persona.empleado, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  @OneToOne(() => Usuario, (usuario) => usuario.empleado)
  usuario: Usuario | null;
}
