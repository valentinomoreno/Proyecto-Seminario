import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TipoFactura } from '../enums/tipo-factura.enum';
import { Venta } from './venta.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn({ name: 'id_factura' })
  idFactura: number;

  @OneToOne(() => Venta, (venta) => venta.factura, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;

  @Column({
    name: 'tipo_factura',
    type: 'enum',
    enum: TipoFactura,
  })
  tipoFactura: TipoFactura;

  @Column({ name: 'numero_factura', type: 'varchar', length: 30, unique: true })
  numeroFactura: string;

  @CreateDateColumn({ name: 'fecha_emision', type: 'timestamptz' })
  fechaEmision: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  subtotal: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  iva: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  total: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  cae: string | null;

  @Column({ name: 'fecha_vencimiento_cae', type: 'date', nullable: true })
  fechaVencimientoCae: Date | null;
}
