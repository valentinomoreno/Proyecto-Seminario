import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sector } from '../entities/sector.entity';
import { ISectoresRepository } from './interfaces/sectores-repository.interface';

@Injectable()
export class TypeOrmSectoresRepository implements ISectoresRepository {
  constructor(
    @InjectRepository(Sector)
    private readonly ormRepository: Repository<Sector>,
  ) {}

  async findAll(depositoId?: number): Promise<Sector[]> {
    return this.ormRepository.find({
      where: depositoId ? { deposito: { idDeposito: depositoId } } : {},
      relations: { deposito: true },
      order: { nombre: 'ASC' },
    });
  }

  async findById(id: number): Promise<Sector | null> {
    return this.ormRepository.findOne({
      where: { idSector: id },
      relations: { deposito: true },
    });
  }

  create(data: Partial<Sector>): Sector {
    return this.ormRepository.create(data);
  }

  async save(sector: Sector): Promise<Sector> {
    return this.ormRepository.save(sector);
  }

  async softRemove(sector: Sector): Promise<Sector> {
    return this.ormRepository.softRemove(sector);
  }

  async countByDeposito(depositoId: number): Promise<number> {
    return this.ormRepository.count({
      where: { deposito: { idDeposito: depositoId } },
    });
  }
}
