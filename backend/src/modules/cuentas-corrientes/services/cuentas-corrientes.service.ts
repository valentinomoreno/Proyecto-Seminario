import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Cliente, TipoCliente } from '../../clientes/entities/cliente.entity';
import {
  CLIENTES_REPOSITORY,
  IClientesRepository,
} from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { CreateCuentaCorrienteDto, QueryCuentasCorrientesDto } from '../dto/cuenta-corriente.dto';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../repositories/interfaces/cuentas-corrientes-repository.interface';

interface PostgresError {
  code?: string;
}

@Injectable()
export class CuentasCorrientesService {
  constructor(
    @Inject(CUENTAS_CORRIENTES_REPOSITORY)
    private readonly repository: ICuentasCorrientesRepository,
    @Inject(CLIENTES_REPOSITORY)
    private readonly clientesRepository: IClientesRepository,
  ) {}

  async findAll(query: QueryCuentasCorrientesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const [cuentas, total] = await this.repository.findAndCount(query);
    return {
      data: cuentas.map((cuenta) => this.toResponse(cuenta)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateCuentaCorrienteDto) {
    const cliente = await this.clientesRepository.findById(dto.clienteId);
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const existing = await this.repository.findByClienteId(dto.clienteId);
    if (existing?.activa) {
      throw new ConflictException('El cliente ya tiene una cuenta corriente activa.');
    }

    try {
      if (existing) {
        existing.activa = true;
        existing.fechaBaja = null;
        existing.saldo = 0;
        existing.limiteCredito = dto.limiteCredito ?? 0;
        await this.repository.save(existing);
        return this.toResponse(await this.requireCuenta(existing.idCuentaCorriente));
      }

      const numeroCuenta = await this.repository.generateNextNumber();
      const cuenta = this.repository.create({
        numeroCuenta,
        saldo: 0,
        limiteCredito: dto.limiteCredito ?? 0,
        activa: true,
        fechaBaja: null,
        cliente,
      });
      const saved = await this.repository.save(cuenta);
      return this.toResponse(await this.requireCuenta(saved.idCuentaCorriente));
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as PostgresError).code === '23505') {
        throw new ConflictException('El cliente ya tiene una cuenta corriente registrada.');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const cuenta = await this.requireCuenta(id);
    if (!cuenta.activa) throw new NotFoundException('Cuenta corriente no encontrada o inactiva.');
    if (Number(cuenta.saldo) !== 0) {
      throw new ConflictException('No se puede dar de baja una cuenta corriente con saldo distinto de cero.');
    }
    cuenta.activa = false;
    cuenta.fechaBaja = new Date();
    await this.repository.save(cuenta);
  }

  private async requireCuenta(id: number): Promise<CuentaCorriente> {
    const cuenta = await this.repository.findById(id);
    if (!cuenta) throw new NotFoundException('Cuenta corriente no encontrada.');
    return cuenta;
  }

  private toResponse(cuenta: CuentaCorriente) {
    const limiteCredito = Number(cuenta.limiteCredito) || 0;
    const saldo = Number(cuenta.saldo) || 0;
    return {
      idCuentaCorriente: cuenta.idCuentaCorriente,
      numeroCuenta: cuenta.numeroCuenta,
      saldo,
      limiteCredito,
      creditoDisponible: Math.max(0, limiteCredito - saldo),
      estado: cuenta.activa ? 'ACTIVA' : 'INACTIVA',
      fechaAlta: cuenta.fechaAlta,
      fechaBaja: cuenta.fechaBaja,
      cliente: this.toClienteSummary(cuenta.cliente),
    };
  }

  private toClienteSummary(cliente: Cliente) {
    return {
      idCliente: cliente.idCliente,
      tipo: cliente.tipo,
      nombreMostrar: cliente.tipo === TipoCliente.PERSONA
        ? `${cliente.persona?.apellido ?? ''}, ${cliente.persona?.nombre ?? ''}`.replace(/^,\s*/, '').trim()
        : cliente.empresa?.razonSocial ?? '',
      documento: cliente.persona?.dni ?? cliente.empresa?.cuit ?? '',
      condicionIva: cliente.condicionIva ? {
        idCondicionIva: cliente.condicionIva.idCondicionIva,
        codigo: cliente.condicionIva.codigo,
        nombre: cliente.condicionIva.nombre,
      } : null,
    };
  }
}
