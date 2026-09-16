import { Marca } from '../../entities/marca.entity';

export const MARCAS_REPOSITORY = Symbol('MARCAS_REPOSITORY');

export interface IMarcasRepository {
  findAll(categoriaId?: number): Promise<Marca[]>;
  findById(id: number): Promise<Marca | null>;
  create(data: Partial<Marca>): Marca;
  save(marca: Marca): Promise<Marca>;
  setCategorias(marcaId: number, categoriaIds: number[]): Promise<void>;
  softRemove(marca: Marca): Promise<Marca>;
}
