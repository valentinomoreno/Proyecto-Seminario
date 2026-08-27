import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';
import { Sector } from './sector.entity';

@Entity('estantes')
@Index('UQ_estante_codigo_sector', ['codigo', 'sector'], { unique: true })
export class Estante {
  @PrimaryGeneratedColumn({ name: 'id_estante' })
  idEstante: number;

  @Column({ type: 'varchar', length: 40 })
  codigo: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  descripcion: string | null;

  @ManyToOne(() => Sector, (sector) => sector.estantes, { nullable: false })
  @JoinColumn({ name: 'id_sector' })
  sector: Sector;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToMany(() => Producto, (producto) => producto.estante)
  productos: Producto[];
}
