import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Persona } from '../../usuarios/entities/persona.entity';
import { QueryClientesDto } from '../dto/query-clientes.dto';
import { Cliente } from '../entities/cliente.entity';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { IClientesRepository } from './interfaces/clientes-repository.interface';

@Injectable()
export class TypeOrmClientesRepository implements IClientesRepository {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
    @InjectRepository(CuentaCorriente)
    private readonly cuentaRepo: Repository<CuentaCorriente>,
  ) {}

  async findAndCount(query: QueryClientesDto): Promise<[Cliente[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const builder = this.clienteRepo
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.cuentaCorriente', 'cuentaCorriente')
      .orderBy('persona.apellido', 'ASC')
      .addOrderBy('persona.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('persona.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.apellido ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.dni ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.cuil ILIKE :buscar', { buscar: `%${buscar}%` });
        }),
      );
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Cliente | null> {
    return this.clienteRepo.findOne({
      where: { idCliente: id },
      relations: { persona: true, cuentaCorriente: true },
    });
  }

  async findByDniOrCuil(dni: string, cuil: string): Promise<Cliente | null> {
    return this.clienteRepo
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.cuentaCorriente', 'cuentaCorriente')
      .where('persona.dni = :dni OR persona.cuil = :cuil', { dni, cuil })
      .getOne();
  }

  create(data: Partial<Cliente>): Cliente {
    return this.clienteRepo.create(data);
  }

  async save(cliente: Cliente): Promise<Cliente> {
    return this.clienteRepo.save(cliente);
  }

  createPersona(data: Partial<Persona>): Persona {
    return this.personaRepo.create(data);
  }

  async savePersona(persona: Persona): Promise<Persona> {
    return this.personaRepo.save(persona);
  }

  async findPersonaByDniOrCuil(dni: string, cuil: string): Promise<Persona | null> {
    return this.personaRepo.findOne({
      where: [{ dni }, { cuil }],
    });
  }

  createCuentaCorriente(data: Partial<CuentaCorriente>): CuentaCorriente {
    return this.cuentaRepo.create(data);
  }

  async saveCuentaCorriente(cuenta: CuentaCorriente): Promise<CuentaCorriente> {
    return this.cuentaRepo.save(cuenta);
  }

  async findCuentaCorrienteByClienteId(clienteId: number): Promise<CuentaCorriente | null> {
    return this.cuentaRepo.findOne({
      where: { cliente: { idCliente: clienteId } },
    });
  }
}
