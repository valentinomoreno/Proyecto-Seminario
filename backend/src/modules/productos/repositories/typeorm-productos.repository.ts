import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { QueryProductosDto } from '../dto/producto.dto';
import { Producto } from '../entities/producto.entity';
import { IProductosRepository } from './interfaces/productos-repository.interface';

@Injectable()
export class TypeOrmProductosRepository implements IProductosRepository {
  constructor(
    @InjectRepository(Producto)
    private readonly ormRepository: Repository<Producto>,
  ) {}

  async findAndCount(query: QueryProductosDto): Promise<[Producto[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const builder = this.ormRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.estante', 'estante')
      .leftJoinAndSelect('estante.sector', 'sector')
      .leftJoinAndSelect('sector.deposito', 'deposito')
      .orderBy('producto.idProducto', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('producto.sku ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('producto.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('producto.descripcion ILIKE :buscar', { buscar: `%${buscar}%` });
        }),
      );
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Producto | null> {
    return this.ormRepository.findOne({
      where: { idProducto: id },
      relations: {
        categoria: true,
        marca: true,
        estante: { sector: { deposito: true } },
      },
    });
  }

  create(data: Partial<Producto>): Producto {
    return this.ormRepository.create(data);
  }

  async save(producto: Producto): Promise<Producto> {
    return this.ormRepository.save(producto);
  }

  async softRemove(producto: Producto): Promise<Producto> {
    return this.ormRepository.softRemove(producto);
  }

  async generateNextSku(): Promise<string> {
    const result = await this.ormRepository.query<Array<{ nextval: string }>>(
      "SELECT nextval('producto_codigo_seq') AS nextval",
    );
    const seq = result[0]?.nextval ?? 1;
    return `PROD-${String(seq).padStart(5, '0')}`;
  }

  async countByCategoria(categoriaId: number): Promise<number> {
    return this.ormRepository.count({
      where: { categoria: { idCategoria: categoriaId } },
    });
  }

  async countByMarca(marcaId: number): Promise<number> {
    return this.ormRepository.count({
      where: { marca: { idMarca: marcaId } },
    });
  }

  async countByEstante(estanteId: number): Promise<number> {
    return this.ormRepository.count({
      where: { estante: { idEstante: estanteId } },
    });
  }
}
