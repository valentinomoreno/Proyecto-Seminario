import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDevolucionesDto } from '../dto/devolucion.dto';
import { Devolucion } from '../entities/devolucion.entity';
import { IDevolucionesRepository } from './interfaces/devoluciones-repository.interface';

const RELACIONES_COMPLETAS = {
  ventaDetalle: { venta: { cliente: true }, producto: true },
  empleadoAutoriza: { persona: true },
  notaCredito: true,
} as const;

@Injectable()
export class TypeOrmDevolucionesRepository implements IDevolucionesRepository {
  constructor(
    @InjectRepository(Devolucion)
    private readonly ormRepository: Repository<Devolucion>,
  ) {}

  async findAndCount(query: QueryDevolucionesDto): Promise<[Devolucion[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    return this.ormRepository.findAndCount({
      relations: RELACIONES_COMPLETAS,
      order: { idDevolucion: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findById(id: number): Promise<Devolucion | null> {
    return this.ormRepository.findOne({
      where: { idDevolucion: id },
      relations: RELACIONES_COMPLETAS,
    });
  }
}
