import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { TipoMovimientoCtaCte } from '../enums/tipo-movimiento-cta-cte.enum';
import { MovimientoCtaCte } from '../entities/movimiento-cta-cte.entity';
import { IMovimientosCtaCteRepository } from './interfaces/movimientos-cta-cte-repository.interface';

@Injectable()
export class TypeOrmMovimientosCtaCteRepository implements IMovimientosCtaCteRepository {
  constructor(
    @InjectRepository(MovimientoCtaCte)
    private readonly ormRepository: Repository<MovimientoCtaCte>,
  ) {}

  async findByCuenta(idCuentaCorriente: number): Promise<MovimientoCtaCte[]> {
    return this.ormRepository.find({
      where: { cuentaCorriente: { idCuentaCorriente } },
      order: { fecha: 'DESC' },
    });
  }

  async existeMoraEnMes(idCuentaCorriente: number, desde: Date): Promise<boolean> {
    const total = await this.ormRepository.count({
      where: {
        cuentaCorriente: { idCuentaCorriente },
        tipo: TipoMovimientoCtaCte.MORA,
        fecha: MoreThanOrEqual(desde),
      },
    });
    return total > 0;
  }

  create(data: Partial<MovimientoCtaCte>): MovimientoCtaCte {
    return this.ormRepository.create(data);
  }

  async save(movimiento: MovimientoCtaCte): Promise<MovimientoCtaCte> {
    return this.ormRepository.save(movimiento);
  }
}
