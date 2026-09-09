import { CuentaCorriente } from '../../entities/cuenta-corriente.entity';

export const CUENTAS_CORRIENTES_REPOSITORY = Symbol('CUENTAS_CORRIENTES_REPOSITORY');

export interface ICuentasCorrientesRepository {
  findAll(): Promise<CuentaCorriente[]>;
  findByCliente(idCliente: number): Promise<CuentaCorriente | null>;
  findById(id: number): Promise<CuentaCorriente | null>;
  findConSaldoDeudor(): Promise<CuentaCorriente[]>;
  save(cuenta: CuentaCorriente): Promise<CuentaCorriente>;
}
