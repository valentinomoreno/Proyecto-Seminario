import { CondicionIva } from '../../entities/condicion-iva.entity';

export const CONDICIONES_IVA_REPOSITORY = Symbol('CONDICIONES_IVA_REPOSITORY');

export interface ICondicionesIvaRepository {
  findAll(): Promise<CondicionIva[]>;
  findById(id: number): Promise<CondicionIva | null>;
}
