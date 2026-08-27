import { Column, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';

@Entity('marcas')
export class Marca {
  @PrimaryGeneratedColumn({ name: 'id_marca' })
  idMarca: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToMany(() => Producto, (producto) => producto.marca)
  productos: Producto[];
}
