import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';

/**
 * Bitácora de avisos de cobro. El UNIQUE (id_cliente, fecha) es lo que garantiza
 * que el cron de los días 1 al 7 no reenvíe dos veces el mismo aviso en el día.
 */
@Entity('avisos_cobro_enviados')
@Unique('UQ_avisos_cobro_enviados_cliente_fecha', ['idCliente', 'fecha'])
export class AvisoCobroEnviado {
  @PrimaryGeneratedColumn({ name: 'id_aviso' })
  idAviso: number;

  @Column({ name: 'id_cliente', type: 'integer' })
  idCliente: number;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;

  /** Fecha calendario (YYYY-MM-DD) en zona horaria de Argentina. */
  @Column({ type: 'date' })
  fecha: string;
}
