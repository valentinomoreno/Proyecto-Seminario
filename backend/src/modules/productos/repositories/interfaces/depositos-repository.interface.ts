import { Deposito } from '../../entities/deposito.entity';

export const DEPOSITOS_REPOSITORY = Symbol('DEPOSITOS_REPOSITORY');

export interface IDepositosRepository {
  findAll(): Promise<Deposito[]>;
  findById(id: number): Promise<Deposito | null>;
  create(data: Partial<Deposito>): Deposito;
  save(deposito: Deposito): Promise<Deposito>;
  softRemove(deposito: Deposito): Promise<Deposito>;
}
