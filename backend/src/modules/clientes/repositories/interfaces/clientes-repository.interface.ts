import { Persona } from '../../../usuarios/entities/persona.entity';
import { QueryClientesDto } from '../../dto/query-clientes.dto';
import { Cliente } from '../../entities/cliente.entity';
import { CuentaCorriente } from '../../entities/cuenta-corriente.entity';

export const CLIENTES_REPOSITORY = Symbol('CLIENTES_REPOSITORY');

export interface IClientesRepository {
  findAndCount(query: QueryClientesDto): Promise<[Cliente[], number]>;
  findById(id: number): Promise<Cliente | null>;
  findByDniOrCuil(dni: string, cuil: string): Promise<Cliente | null>;
  create(data: Partial<Cliente>): Cliente;
  save(cliente: Cliente): Promise<Cliente>;
  createPersona(data: Partial<Persona>): Persona;
  savePersona(persona: Persona): Promise<Persona>;
  findPersonaByDniOrCuil(dni: string, cuil: string): Promise<Persona | null>;
  createCuentaCorriente(data: Partial<CuentaCorriente>): CuentaCorriente;
  saveCuentaCorriente(cuenta: CuentaCorriente): Promise<CuentaCorriente>;
  findCuentaCorrienteByClienteId(clienteId: number): Promise<CuentaCorriente | null>;
}
