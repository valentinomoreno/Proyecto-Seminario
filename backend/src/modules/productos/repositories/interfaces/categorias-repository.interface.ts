import { Categoria } from '../../entities/categoria.entity';

export const CATEGORIAS_REPOSITORY = Symbol('CATEGORIAS_REPOSITORY');

export interface ICategoriasRepository {
  findAll(): Promise<Categoria[]>;
  findById(id: number): Promise<Categoria | null>;
  create(data: Partial<Categoria>): Categoria;
  save(categoria: Categoria): Promise<Categoria>;
  softRemove(categoria: Categoria): Promise<Categoria>;
}
