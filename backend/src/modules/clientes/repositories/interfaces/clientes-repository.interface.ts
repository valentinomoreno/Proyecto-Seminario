import { CreateClienteEmpresaDto, CreateClientePersonaDto, QueryClientesDto } from '../../dto/cliente.dto';
import { Cliente } from '../../entities/cliente.entity';
import { CondicionIva } from '../../entities/condicion-iva.entity';

export const CLIENTES_REPOSITORY = Symbol('CLIENTES_REPOSITORY');

export interface IClientesRepository {
  findAndCount(query: QueryClientesDto): Promise<[Cliente[], number]>;
  findById(id: number): Promise<Cliente | null>;
  existsPersonaByDni(dni: string): Promise<boolean>;
  existsPersonaByCuil(cuil: string): Promise<boolean>;
  existsEmpresaByCuit(cuit: string): Promise<boolean>;
  createPersona(dto: CreateClientePersonaDto, condicionIva: CondicionIva): Promise<Cliente>;
  createEmpresa(dto: CreateClienteEmpresaDto, condicionIva: CondicionIva): Promise<Cliente>;
  save(cliente: Cliente): Promise<Cliente>;
  softRemove(cliente: Cliente): Promise<Cliente>;
}
