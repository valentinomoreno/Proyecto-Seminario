import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';
import { ICategoriasRepository } from './interfaces/categorias-repository.interface';

@Injectable()
export class TypeOrmCategoriasRepository implements ICategoriasRepository {
  constructor(
    @InjectRepository(Categoria)
    private readonly ormRepository: Repository<Categoria>,
  ) {}

  async findAll(): Promise<Categoria[]> {
    return this.ormRepository.find({ order: { nombre: 'ASC' } });
  }

  async findById(id: number): Promise<Categoria | null> {
    return this.ormRepository.findOneBy({ idCategoria: id });
  }

  create(data: Partial<Categoria>): Categoria {
    return this.ormRepository.create(data);
  }

  async save(categoria: Categoria): Promise<Categoria> {
    return this.ormRepository.save(categoria);
  }

  async softRemove(categoria: Categoria): Promise<Categoria> {
    return this.ormRepository.softRemove(categoria);
  }
}
