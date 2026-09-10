import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryCuentasCorrientesDto } from '../dto/cuenta-corriente.dto';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { ICuentasCorrientesRepository } from './interfaces/cuentas-corrientes-repository.interface';

@Injectable()
export class TypeOrmCuentasCorrientesRepository implements ICuentasCorrientesRepository {
  constructor(
    @InjectRepository(CuentaCorriente)
    private readonly ormRepository: Repository<CuentaCorriente>,
  ) {}

  async findAndCount(query: QueryCuentasCorrientesDto): Promise<[CuentaCorriente[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    return this.ormRepository
      .createQueryBuilder('cuenta')
      .innerJoinAndSelect('cuenta.cliente', 'cliente', 'cliente.fecha_baja IS NULL')
      .leftJoinAndSelect('cliente.condicionIva', 'condicionIva')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .orderBy('cuenta.idCuentaCorriente', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findById(id: number): Promise<CuentaCorriente | null> {
    return this.ormRepository
      .createQueryBuilder('cuenta')
      .innerJoinAndSelect('cuenta.cliente', 'cliente', 'cliente.fecha_baja IS NULL')
      .leftJoinAndSelect('cliente.condicionIva', 'condicionIva')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .where('cuenta.idCuentaCorriente = :id', { id })
      .getOne();
  }

  async findByClienteId(clienteId: number): Promise<CuentaCorriente | null> {
    return this.ormRepository.findOne({
      where: { cliente: { idCliente: clienteId } },
      relations: { cliente: true },
    });
  }

  async findConSaldoDeudor(): Promise<CuentaCorriente[]> {
    return this.ormRepository
      .createQueryBuilder('cuenta')
      .innerJoinAndSelect('cuenta.cliente', 'cliente', 'cliente.fecha_baja IS NULL')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .where('cuenta.saldo > 0')
      .andWhere('cuenta.activa = true')
      .orderBy('cuenta.idCuentaCorriente', 'ASC')
      .getMany();
  }

  create(data: Partial<CuentaCorriente>): CuentaCorriente {
    return this.ormRepository.create(data);
  }

  async save(cuenta: CuentaCorriente): Promise<CuentaCorriente> {
    return this.ormRepository.save(cuenta);
  }

  async generateNextNumber(): Promise<string> {
    const result = await this.ormRepository.query<Array<{ nextval: string }>>(
      "SELECT nextval('cuenta_corriente_numero_seq') AS nextval",
    );
    const nextValue = result[0]?.nextval ?? '1';
    return `CC-${String(nextValue).padStart(6, '0')}`;
  }
}
