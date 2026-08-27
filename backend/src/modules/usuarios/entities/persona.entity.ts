import { Column, Entity, Index, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Empleado } from './empleado.entity';

@Entity('personas')
export class Persona {
  @PrimaryGeneratedColumn({ name: 'id_persona' })
  idPersona: number;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'varchar', length: 80 })
  apellido: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 11 })
  cuil: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 8 })
  dni: string;

  @OneToOne(() => Empleado, (empleado) => empleado.persona)
  empleado: Empleado;
}
