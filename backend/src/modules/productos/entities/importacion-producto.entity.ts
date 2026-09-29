import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export interface ErrorImportacionRegistrado {
  fila: number;
  sku: string;
  producto: string;
  errores: string[];
}

@Entity('importaciones_productos')
export class ImportacionProducto {
  @PrimaryGeneratedColumn({ name: 'id_importacion' })
  idImportacion: number;

  @CreateDateColumn({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora: Date;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ name: 'usuario_nombre', type: 'varchar', length: 60 })
  usuarioNombre: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario | null;

  @Column({ name: 'total_procesados', type: 'integer' })
  totalProcesados: number;

  @Column({ type: 'integer' })
  creados: number;

  @Column({ type: 'integer' })
  actualizados: number;

  @Column({ name: 'sin_cambios', type: 'integer' })
  sinCambios: number;

  @Column({ type: 'integer' })
  errores: number;

  @Column({ name: 'detalle_errores', type: 'jsonb', default: () => "'[]'::jsonb" })
  detalleErrores: ErrorImportacionRegistrado[];
}
