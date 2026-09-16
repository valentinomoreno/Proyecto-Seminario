import { Column, DeleteDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';
import { Marca } from './marca.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  idCategoria: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  descripcion: string | null;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];

  @ManyToMany(() => Marca, (marca) => marca.categorias)
  @JoinTable({
    name: 'categorias_marcas',
    joinColumn: { name: 'id_categoria', referencedColumnName: 'idCategoria' },
    inverseJoinColumn: { name: 'id_marca', referencedColumnName: 'idMarca' },
  })
  marcas: Marca[];
}
