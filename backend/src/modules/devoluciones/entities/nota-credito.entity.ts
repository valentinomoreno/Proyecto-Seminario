import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/database/decimal.transformer';
import { EstadoNotaCredito } from '../enums/estado-nota-credito.enum';
import { Devolucion } from './devolucion.entity';

@Entity('notas_credito')
@Check('CHK_nota_credito_monto', '"monto" > 0')
export class NotaCredito {
  @PrimaryGeneratedColumn({ name: 'id_nota_credito' })
  idNotaCredito: number;

  @OneToOne(() => Devolucion, (devolucion) => devolucion.notaCredito, { nullable: false })
  @JoinColumn({ name: 'id_devolucion' })
  devolucion: Devolucion;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  monto: number;

  @CreateDateColumn({ name: 'fecha_emision', type: 'timestamptz' })
  fechaEmision: Date;

  @Column({ type: 'enum', enum: EstadoNotaCredito, default: EstadoNotaCredito.EMITIDA })
  estado: EstadoNotaCredito;
}
