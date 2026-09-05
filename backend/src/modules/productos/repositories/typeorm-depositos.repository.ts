import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposito } from '../entities/deposito.entity';
import { IDepositosRepository } from './interfaces/depositos-repository.interface';

@Injectable()
export class TypeOrmDepositosRepository implements IDepositosRepository {
  constructor(
    @InjectRepository(Deposito)
    private readonly ormRepository: Repository<Deposito>,
  ) {}

  async findAll(): Promise<Deposito[]> {
    return this.ormRepository.find({ order: { nombre: 'ASC' } });
  }

  async findById(id: number): Promise<Deposito | null> {
    return this.ormRepository.findOneBy({ idDeposito: id });
  }

  create(data: Partial<Deposito>): Deposito {
    return this.ormRepository.create(data);
  }

  async save(deposito: Deposito): Promise<Deposito> {
    return this.ormRepository.save(deposito);
  }

  async softRemove(deposito: Deposito): Promise<Deposito> {
    return this.ormRepository.softRemove(deposito);
  }
}
