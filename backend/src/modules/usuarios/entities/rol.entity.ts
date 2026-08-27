import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { Usuario } from './usuario.entity';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol: number;

  @Column({ type: 'enum', enum: NombreRol, unique: true })
  nombre: NombreRol;

  @Column({ type: 'varchar', length: 160, nullable: true })
  descripcion: string | null;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];
}
