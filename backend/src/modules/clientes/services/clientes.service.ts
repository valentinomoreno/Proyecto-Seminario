import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  CreateClienteEmpresaDto,
  CreateClientePersonaDto,
  QueryClientesDto,
  UpdateClienteDto,
} from '../dto/cliente.dto';
import { Cliente, TipoCliente } from '../entities/cliente.entity';
import {
  CLIENTES_REPOSITORY,
  IClientesRepository,
} from '../repositories/interfaces/clientes-repository.interface';
import {
  CONDICIONES_IVA_REPOSITORY,
  ICondicionesIvaRepository,
} from '../repositories/interfaces/condiciones-iva-repository.interface';

interface PostgresError {
  code?: string;
  constraint?: string;
}

@Injectable()
export class ClientesService {
  constructor(
    @Inject(CLIENTES_REPOSITORY)
    private readonly repository: IClientesRepository,
    @Inject(CONDICIONES_IVA_REPOSITORY)
    private readonly condicionesRepository: ICondicionesIvaRepository,
  ) {}

  async findAll(query: QueryClientesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const [clientes, total] = await this.repository.findAndCount(query);
    return {
      data: clientes.map((cliente) => this.toResponse(cliente)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.toResponse(await this.requireCliente(id));
  }

  async createPersona(dto: CreateClientePersonaDto) {
    const condicionIva = await this.condicionesRepository.findById(dto.condicionIvaId);
    if (!condicionIva) throw new NotFoundException('Condición de IVA no encontrada.');

    if (await this.repository.existsPersonaByDni(dto.dni)) {
      throw new ConflictException('Ya existe un cliente con ese DNI.');
    }
    if (await this.repository.existsPersonaByCuil(dto.cuil)) {
      throw new ConflictException('Ya existe un cliente con ese CUIL.');
    }

    try {
      return this.toResponse(await this.repository.createPersona(dto, condicionIva));
    } catch (error) {
      this.throwDuplicateDocumentError(error);
    }
  }

  async createEmpresa(dto: CreateClienteEmpresaDto) {
    const condicionIva = await this.condicionesRepository.findById(dto.condicionIvaId);
    if (!condicionIva) throw new NotFoundException('Condición de IVA no encontrada.');

    if (await this.repository.existsEmpresaByCuit(dto.cuit)) {
      throw new ConflictException('Ya existe un cliente con ese CUIT.');
    }

    try {
      return this.toResponse(await this.repository.createEmpresa(dto, condicionIva));
    } catch (error) {
      this.throwDuplicateDocumentError(error);
    }
  }

  async update(id: number, dto: UpdateClienteDto) {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('Debe proporcionar al menos un dato de contacto para modificar.');
    }

    const cliente = await this.requireCliente(id);
    if (dto.telefono !== undefined) cliente.telefono = dto.telefono;
    if (dto.correo !== undefined) cliente.correo = dto.correo;
    if (dto.direccion !== undefined) cliente.direccion = dto.direccion;
    return this.toResponse(await this.repository.save(cliente));
  }

  async remove(id: number): Promise<void> {
    const cliente = await this.requireCliente(id);
    if (cliente.cuentaCorriente?.activa) {
      throw new ConflictException('Debe dar de baja la cuenta corriente activa antes de eliminar el cliente.');
    }
    await this.repository.softRemove(cliente);
  }

  private async requireCliente(id: number): Promise<Cliente> {
    const cliente = await this.repository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    return cliente;
  }

  private throwDuplicateDocumentError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as PostgresError;
      if (driverError.code === '23505') {
        const constraint = driverError.constraint ?? '';
        if (constraint.includes('dni')) throw new ConflictException('Ya existe un cliente con ese DNI.');
        if (constraint.includes('cuil')) throw new ConflictException('Ya existe un cliente con ese CUIL.');
        if (constraint.includes('cuit')) throw new ConflictException('Ya existe un cliente con ese CUIT.');
      }
    }
    throw error;
  }

  private toResponse(cliente: Cliente) {
    const cuenta = cliente.cuentaCorriente;
    const estadoCuenta = !cuenta ? 'SIN_CUENTA' : cuenta.activa ? 'ACTIVA' : 'INACTIVA';
    const nombreMostrar = cliente.tipo === TipoCliente.PERSONA
      ? `${cliente.persona?.apellido ?? ''}, ${cliente.persona?.nombre ?? ''}`.replace(/^,\s*/, '').trim()
      : cliente.empresa?.razonSocial ?? '';

    return {
      idCliente: cliente.idCliente,
      tipo: cliente.tipo,
      nombreMostrar,
      condicionIva: {
        idCondicionIva: cliente.condicionIva.idCondicionIva,
        codigo: cliente.condicionIva.codigo,
        nombre: cliente.condicionIva.nombre,
      },
      contacto: {
        telefono: cliente.telefono ?? null,
        correo: cliente.correo ?? null,
        direccion: cliente.direccion ?? null,
      },
      persona: cliente.persona ? {
        nombre: cliente.persona.nombre,
        apellido: cliente.persona.apellido,
        dni: cliente.persona.dni,
        cuil: cliente.persona.cuil,
      } : null,
      empresa: cliente.empresa ? {
        cuit: cliente.empresa.cuit,
        razonSocial: cliente.empresa.razonSocial,
        personaContacto: cliente.empresa.personaContacto,
      } : null,
      estadoCuenta,
      cuentaCorriente: cuenta ? {
        idCuentaCorriente: cuenta.idCuentaCorriente,
        numeroCuenta: cuenta.numeroCuenta,
        saldo: cuenta.saldo,
        estado: cuenta.activa ? 'ACTIVA' : 'INACTIVA',
      } : null,
    };
  }
}
