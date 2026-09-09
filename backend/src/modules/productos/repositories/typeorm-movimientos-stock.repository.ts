import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { IMovimientosStockRepository } from './interfaces/movimientos-stock-repository.interface';

@Injectable()
export class TypeOrmMovimientosStockRepository implements IMovimientosStockRepository {
  constructor(
    @InjectRepository(MovimientoStock)
    private readonly ormRepository: Repository<MovimientoStock>,
  ) {}

  async findByProducto(idProducto: number): Promise<MovimientoStock[]> {
    return this.ormRepository.find({
      where: { producto: { idProducto } },
      relations: {
        producto: true,
        empleado: true,
      },
      order: { fecha: 'DESC' },
    });
  }

  create(data: Partial<MovimientoStock>): MovimientoStock {
    return this.ormRepository.create(data);
  }

  async save(movimiento: MovimientoStock): Promise<MovimientoStock> {
    return this.ormRepository.save(movimiento);
  }
}
