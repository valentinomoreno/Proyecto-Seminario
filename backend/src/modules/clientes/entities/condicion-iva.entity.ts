import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('condiciones_iva')
export class CondicionIva {
  @PrimaryGeneratedColumn({ name: 'id_condicion_iva' })
  idCondicionIva: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  nombre: string;

  @OneToMany(() => Cliente, (cliente) => cliente.condicionIva)
  clientes: Cliente[];
}
