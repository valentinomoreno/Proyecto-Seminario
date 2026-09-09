import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { QueryClientesDto } from '../dto/cliente.dto';
import { Cliente } from '../entities/cliente.entity';
import { IClientesRepository } from './interfaces/clientes-repository.interface';

@Injectable()
export class TypeOrmClientesRepository implements IClientesRepository {
  constructor(
    @InjectRepository(Cliente)
    private readonly ormRepository: Repository<Cliente>,
  ) {}

  async findAndCount(query: QueryClientesDto): Promise<[Cliente[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const builder = this.ormRepository
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.cuentaCorriente', 'cuentaCorriente')
      .orderBy('cliente.idCliente', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('cliente.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('cliente.apellido ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('cliente.dniCuit ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('cliente.email ILIKE :buscar', { buscar: `%${buscar}%` });
        }),
      );
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Cliente | null> {
    return this.ormRepository.findOne({
      where: { idCliente: id },
      relations: {
        cuentaCorriente: true,
      },
    });
  }

  create(data: Partial<Cliente>): Cliente {
    return this.ormRepository.create(data);
  }

  async save(cliente: Cliente): Promise<Cliente> {
    return this.ormRepository.save(cliente);
  }

  async softRemove(cliente: Cliente): Promise<Cliente> {
    return this.ormRepository.softRemove(cliente);
  }
}
