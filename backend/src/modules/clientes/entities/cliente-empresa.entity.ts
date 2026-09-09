import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('clientes_empresa')
export class ClienteEmpresa {
  @PrimaryGeneratedColumn({ name: 'id_cliente_empresa' })
  idClienteEmpresa: number;

  @Column({ type: 'varchar', length: 11, unique: true })
  cuit: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 160 })
  razonSocial: string;

  @Column({ name: 'persona_contacto', type: 'varchar', length: 160 })
  personaContacto: string;

  @OneToOne(() => Cliente, (cliente) => cliente.empresa, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente;
}
