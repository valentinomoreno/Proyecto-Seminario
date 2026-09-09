import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/database/decimal.transformer';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { VentaDetalle } from '../../ventas/entities/venta-detalle.entity';
import { NotaCredito } from './nota-credito.entity';

/**
 * Registro inmutable de auditoría (RNF-05): no tiene baja lógica ni endpoints de
 * edición, y `empleadoAutoriza` es obligatorio para dejar asentado quién autorizó.
 */
@Entity('devoluciones')
@Check('CHK_devolucion_cantidad', '"cantidad_devuelta" > 0')
@Check('CHK_devolucion_monto', '"monto_devuelto" > 0')
export class Devolucion {
  @PrimaryGeneratedColumn({ name: 'id_devolucion' })
  idDevolucion: number;

  @ManyToOne(() => VentaDetalle, { nullable: false })
  @JoinColumn({ name: 'id_venta_detalle' })
  ventaDetalle: VentaDetalle;

  @Column({ name: 'cantidad_devuelta', type: 'integer' })
  cantidadDevuelta: number;

  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @Column({ name: 'monto_devuelto', type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  montoDevuelto: number;

  @Column({ name: 'apto_reingreso', type: 'boolean' })
  aptoReingreso: boolean;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @ManyToOne(() => Empleado, { nullable: false })
  @JoinColumn({ name: 'id_empleado_autoriza' })
  empleadoAutoriza: Empleado;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @OneToOne(() => NotaCredito, (notaCredito) => notaCredito.devolucion)
  notaCredito: NotaCredito;
}
