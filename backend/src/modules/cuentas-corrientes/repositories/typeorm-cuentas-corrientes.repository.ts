import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { ICuentasCorrientesRepository } from './interfaces/cuentas-corrientes-repository.interface';

@Injectable()
export class TypeOrmCuentasCorrientesRepository implements ICuentasCorrientesRepository {
  constructor(
    @InjectRepository(CuentaCorriente)
    private readonly ormRepository: Repository<CuentaCorriente>,
  ) {}

  async findAll(): Promise<CuentaCorriente[]> {
    return this.ormRepository.find({
      relations: { cliente: true },
      order: { saldo: 'DESC' },
    });
  }

  async findByCliente(idCliente: number): Promise<CuentaCorriente | null> {
    return this.ormRepository.findOne({
      where: { cliente: { idCliente } },
      relations: { cliente: true },
    });
  }

  async findById(id: number): Promise<CuentaCorriente | null> {
    return this.ormRepository.findOne({
      where: { idCuentaCorriente: id },
      relations: { cliente: true },
    });
  }

  async findConSaldoDeudor(): Promise<CuentaCorriente[]> {
    return this.ormRepository.find({
      where: { saldo: MoreThan(0) },
      relations: { cliente: true },
      order: { saldo: 'DESC' },
    });
  }

  async save(cuenta: CuentaCorriente): Promise<CuentaCorriente> {
    return this.ormRepository.save(cuenta);
  }
}
