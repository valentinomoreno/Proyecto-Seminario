import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marca } from '../entities/marca.entity';
import { IMarcasRepository } from './interfaces/marcas-repository.interface';

@Injectable()
export class TypeOrmMarcasRepository implements IMarcasRepository {
  constructor(
    @InjectRepository(Marca)
    private readonly ormRepository: Repository<Marca>,
  ) {}

  async findAll(categoriaId?: number): Promise<Marca[]> {
    if (!categoriaId) {
      return this.ormRepository.find({ relations: { categorias: true }, order: { nombre: 'ASC' } });
    }
    return this.ormRepository
      .createQueryBuilder('marca')
      .innerJoin('marca.categorias', 'categoria', 'categoria.idCategoria = :categoriaId', { categoriaId })
      .leftJoinAndSelect('marca.categorias', 'categorias')
      .orderBy('marca.nombre', 'ASC')
      .getMany();
  }

  async findById(id: number): Promise<Marca | null> {
    return this.ormRepository.findOne({
      where: { idMarca: id },
      relations: { categorias: true },
    });
  }

  create(data: Partial<Marca>): Marca {
    return this.ormRepository.create(data);
  }

  async save(marca: Marca): Promise<Marca> {
    return this.ormRepository.save(marca);
  }

  async setCategorias(marcaId: number, categoriaIds: number[]): Promise<void> {
    const marca = await this.findById(marcaId);
    const actuales = marca?.categorias.map((categoria) => categoria.idCategoria) ?? [];
    await this.ormRepository
      .createQueryBuilder()
      .relation(Marca, 'categorias')
      .of(marcaId)
      .addAndRemove(categoriaIds, actuales);
  }

  async softRemove(marca: Marca): Promise<Marca> {
    return this.ormRepository.softRemove(marca);
  }
}
