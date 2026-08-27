import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Empleado } from './empleado.entity';
import { Rol } from './rol.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  idUsuario: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  nombre: string;

  @Column({ name: 'contrasena_hash', type: 'varchar', length: 100, select: false })
  contrasenaHash: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Rol, (rol) => rol.usuarios, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_rol' })
  rol: Rol;

  @OneToOne(() => Empleado, (empleado) => empleado.usuario, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  empleado: Empleado | null;
}
