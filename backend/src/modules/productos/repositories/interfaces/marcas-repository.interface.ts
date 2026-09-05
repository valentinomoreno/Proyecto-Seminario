import { Marca } from '../../entities/marca.entity';

export const MARCAS_REPOSITORY = Symbol('MARCAS_REPOSITORY');

export interface IMarcasRepository {
  findAll(): Promise<Marca[]>;
  findById(id: number): Promise<Marca | null>;
  create(data: Partial<Marca>): Marca;
  save(marca: Marca): Promise<Marca>;
  softRemove(marca: Marca): Promise<Marca>;
}
