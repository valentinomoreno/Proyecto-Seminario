import { QueryClientesDto } from '../../dto/cliente.dto';
import { Cliente } from '../../entities/cliente.entity';

export const CLIENTES_REPOSITORY = Symbol('CLIENTES_REPOSITORY');

export interface IClientesRepository {
  findAndCount(query: QueryClientesDto): Promise<[Cliente[], number]>;
  findById(id: number): Promise<Cliente | null>;
  create(data: Partial<Cliente>): Cliente;
  save(cliente: Cliente): Promise<Cliente>;
  softRemove(cliente: Cliente): Promise<Cliente>;
}
