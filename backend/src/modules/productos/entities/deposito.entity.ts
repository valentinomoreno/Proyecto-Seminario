import { Column, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Sector } from './sector.entity';

@Entity('depositos')
export class Deposito {
  @PrimaryGeneratedColumn({ name: 'id_deposito' })
  idDeposito: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  direccion: string | null;

  @DeleteDateColumn({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @OneToMany(() => Sector, (sector) => sector.deposito)
  sectores: Sector[];
}
