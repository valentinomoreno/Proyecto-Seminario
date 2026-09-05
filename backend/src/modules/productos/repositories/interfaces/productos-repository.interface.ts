import { QueryProductosDto } from '../../dto/producto.dto';
import { Producto } from '../../entities/producto.entity';

export const PRODUCTOS_REPOSITORY = Symbol('PRODUCTOS_REPOSITORY');

export interface IProductosRepository {
  findAndCount(query: QueryProductosDto): Promise<[Producto[], number]>;
  findById(id: number): Promise<Producto | null>;
  create(data: Partial<Producto>): Producto;
  save(producto: Producto): Promise<Producto>;
  softRemove(producto: Producto): Promise<Producto>;
  generateNextSku(): Promise<string>;
  countByCategoria(categoriaId: number): Promise<number>;
  countByMarca(marcaId: number): Promise<number>;
  countByEstante(estanteId: number): Promise<number>;
}
