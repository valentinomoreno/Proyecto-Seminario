import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { CreateClienteDto, QueryClientesDto, UpdateClienteDto } from '../dto/cliente.dto';
import { Cliente } from '../entities/cliente.entity';
import { CLIENTES_REPOSITORY, IClientesRepository } from '../repositories/interfaces/clientes-repository.interface';

@Injectable()
export class ClientesService {
  constructor(
    @Inject(CLIENTES_REPOSITORY) private readonly repository: IClientesRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryClientesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const [clientes, total] = await this.repository.findAndCount(query);

    return {
      data: clientes.map((cliente) => this.toResponse(cliente)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const cliente = await this.repository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    return this.toResponse(cliente);
  }

  async create(dto: CreateClienteDto) {
    try {
      // Regla de negocio: 1 cliente = 1 cuenta corriente, creados de forma atómica.
      const cliente = await this.dataSource.transaction(async (manager) => {
        const clientesRepository = manager.getRepository(Cliente);
        const cuentasCorrientesRepository = manager.getRepository(CuentaCorriente);

        const nuevoCliente = clientesRepository.create({
          nombre: dto.nombre.trim(),
          apellido: dto.apellido.trim(),
          dniCuit: dto.dniCuit.trim(),
          email: dto.email.trim(),
          telefono: dto.telefono?.trim() || null,
          activo: true,
        });
        const clienteGuardado = await clientesRepository.save(nuevoCliente);

        const nuevaCuentaCorriente = cuentasCorrientesRepository.create({
          cliente: clienteGuardado,
          saldo: 0,
          fechaUltimoMovimiento: null,
        });
        clienteGuardado.cuentaCorriente = await cuentasCorrientesRepository.save(nuevaCuentaCorriente);

        return clienteGuardado;
      });

      return this.toResponse(cliente);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = await this.repository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    if (dto.nombre !== undefined) cliente.nombre = dto.nombre.trim();
    if (dto.apellido !== undefined) cliente.apellido = dto.apellido.trim();
    if (dto.dniCuit !== undefined) cliente.dniCuit = dto.dniCuit.trim();
    if (dto.email !== undefined) cliente.email = dto.email.trim();
    if (dto.telefono !== undefined) cliente.telefono = dto.telefono?.trim() || null;

    try {
      return this.toResponse(await this.repository.save(cliente));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const cliente = await this.repository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    await this.repository.softRemove(cliente);
  }

  private toResponse(cliente: Cliente) {
    return {
      idCliente: cliente.idCliente,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      dniCuit: cliente.dniCuit,
      email: cliente.email,
      telefono: cliente.telefono ?? null,
      activo: cliente.activo,
      saldoCuentaCorriente: cliente.cuentaCorriente ? cliente.cuentaCorriente.saldo : null,
    };
  }
}
