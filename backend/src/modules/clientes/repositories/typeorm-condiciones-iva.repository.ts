import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CondicionIva } from '../entities/condicion-iva.entity';
import { ICondicionesIvaRepository } from './interfaces/condiciones-iva-repository.interface';

@Injectable()
export class TypeOrmCondicionesIvaRepository implements ICondicionesIvaRepository {
  constructor(
    @InjectRepository(CondicionIva)
    private readonly ormRepository: Repository<CondicionIva>,
  ) {}

  async findAll(): Promise<CondicionIva[]> {
    return this.ormRepository.find({ order: { idCondicionIva: 'ASC' } });
  }

  async findById(id: number): Promise<CondicionIva | null> {
    return this.ormRepository.findOneBy({ idCondicionIva: id });
  }
}
