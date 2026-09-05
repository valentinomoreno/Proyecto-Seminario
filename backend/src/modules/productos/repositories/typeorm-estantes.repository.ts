import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estante } from '../entities/estante.entity';
import { IEstantesRepository } from './interfaces/estantes-repository.interface';

@Injectable()
export class TypeOrmEstantesRepository implements IEstantesRepository {
  constructor(
    @InjectRepository(Estante)
    private readonly ormRepository: Repository<Estante>,
  ) {}

  async findAll(sectorId?: number): Promise<Estante[]> {
    return this.ormRepository.find({
      where: sectorId ? { sector: { idSector: sectorId } } : {},
      relations: { sector: { deposito: true } },
      order: { codigo: 'ASC' },
    });
  }

  async findById(id: number): Promise<Estante | null> {
    return this.ormRepository.findOne({
      where: { idEstante: id },
      relations: { sector: { deposito: true } },
    });
  }

  create(data: Partial<Estante>): Estante {
    return this.ormRepository.create(data);
  }

  async save(estante: Estante): Promise<Estante> {
    return this.ormRepository.save(estante);
  }

  async softRemove(estante: Estante): Promise<Estante> {
    return this.ormRepository.softRemove(estante);
  }

  async countBySector(sectorId: number): Promise<number> {
    return this.ormRepository.count({
      where: { sector: { idSector: sectorId } },
    });
  }
}
