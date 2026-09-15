import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoCtaCorriente } from '../entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../enums/tipo-movimiento-cta-corriente.enum';
import { IMovimientosCtaCorrienteRepository } from './interfaces/movimientos-cta-corriente-repository.interface';

@Injectable()
export class TypeOrmMovimientosCtaCorrienteRepository implements IMovimientosCtaCorrienteRepository {
  constructor(
    @InjectRepository(MovimientoCtaCorriente)
    private readonly ormRepository: Repository<MovimientoCtaCorriente>,
  ) {}

  async findByCuenta(idCuentaCorriente: number): Promise<MovimientoCtaCorriente[]> {
    return this.ormRepository.find({
      where: { cuentaCorriente: { idCuentaCorriente } },
      relations: { venta: true },
      order: { fecha: 'DESC' },
    });
  }

  async existeMoraEnMes(idCuentaCorriente: number, desde: Date): Promise<boolean> {
    return this.ormRepository
      .createQueryBuilder('movimiento')
      .where('movimiento.id_cuenta_corriente = :idCuentaCorriente', { idCuentaCorriente })
      .andWhere('movimiento.tipo = :tipo', { tipo: TipoMovimientoCtaCorriente.MORA })
      .andWhere('movimiento.fecha >= :desde', { desde })
      .getExists();
  }
}
