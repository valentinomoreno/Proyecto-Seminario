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

  async findAll(): Promise<Marca[]> {
    return this.ormRepository.find({ order: { nombre: 'ASC' } });
  }

  async findById(id: number): Promise<Marca | null> {
    return this.ormRepository.findOneBy({ idMarca: id });
  }

  create(data: Partial<Marca>): Marca {
    return this.ormRepository.create(data);
  }

  async save(marca: Marca): Promise<Marca> {
    return this.ormRepository.save(marca);
  }

  async softRemove(marca: Marca): Promise<Marca> {
    return this.ormRepository.softRemove(marca);
  }
}
