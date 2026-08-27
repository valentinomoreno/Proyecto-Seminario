import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Deposito } from './deposito.entity';
import { Estante } from './estante.entity';

@Entity('sectores')
@Index('UQ_sector_nombre_deposito', ['nombre', 'deposito'], { unique: true })
export class Sector {
  @PrimaryGeneratedColumn({ name: 'id_sector' })
  idSector: number;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @ManyToOne(() => Deposito, (deposito) => deposito.sectores, { nullable: false })
  @JoinColumn({ name: 'id_deposito' })
  deposito: Deposito;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToMany(() => Estante, (estante) => estante.sector)
  estantes: Estante[];
}
