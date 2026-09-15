import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MetodoCobro } from '../enums/metodo-cobro.enum';
import { Venta } from './venta.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('cobros')
@Check('CHK_cobro_monto', '"monto" > 0')
export class Cobro {
  @PrimaryGeneratedColumn({ name: 'id_cobro' })
  idCobro: number;

  @OneToOne(() => Venta, (venta) => venta.cobro, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;

  @Column({
    name: 'metodo_cobro',
    type: 'enum',
    enum: MetodoCobro,
    enumName: 'metodo_cobro_enum',
  })
  metodoCobro: MetodoCobro;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  monto: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia: string | null;
}
