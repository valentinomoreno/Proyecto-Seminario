import { Check, Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Categoria } from './categoria.entity';
import { Estante } from './estante.entity';
import { Marca } from './marca.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => value === null ? null : Number(value),
};

@Entity('productos')
@Check('CHK_producto_stock', '"stock" >= 0')
@Check('CHK_producto_precio', '"precio_unitario" > 0')
@Check('CHK_producto_costo', '"costo" IS NULL OR "costo" >= 0')
export class Producto {
  @PrimaryGeneratedColumn({ name: 'id_producto' })
  idProducto: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  sku: string;

  @Index()
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'integer', default: 0 })
  stock: number;

  @Column({ name: 'precio_unitario', type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  precioUnitario: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  costo: number | null;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos, { nullable: false })
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @ManyToOne(() => Marca, (marca) => marca.productos, { nullable: false })
  @JoinColumn({ name: 'id_marca' })
  marca: Marca;

  @ManyToOne(() => Estante, (estante) => estante.productos, { nullable: false })
  @JoinColumn({ name: 'id_estante' })
  estante: Estante;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;
}
