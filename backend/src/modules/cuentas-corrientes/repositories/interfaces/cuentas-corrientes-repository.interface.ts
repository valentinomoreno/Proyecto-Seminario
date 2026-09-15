import { QueryCuentasCorrientesDto } from '../../dto/cuenta-corriente.dto';
import { CuentaCorriente } from '../../entities/cuenta-corriente.entity';

export const CUENTAS_CORRIENTES_REPOSITORY = Symbol('CUENTAS_CORRIENTES_REPOSITORY');

export interface ICuentasCorrientesRepository {
  findAndCount(query: QueryCuentasCorrientesDto): Promise<[CuentaCorriente[], number]>;
  findById(id: number): Promise<CuentaCorriente | null>;
  findByClienteId(clienteId: number): Promise<CuentaCorriente | null>;
  create(data: Partial<CuentaCorriente>): CuentaCorriente;
  save(cuenta: CuentaCorriente): Promise<CuentaCorriente>;
  generateNextNumber(): Promise<string>;
}
