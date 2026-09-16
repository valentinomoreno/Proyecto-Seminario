import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { Cliente, TipoCliente } from '../../clientes/entities/cliente.entity';
import {
  CLIENTES_REPOSITORY,
  IClientesRepository,
} from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { CreateCuentaCorrienteDto, QueryCuentasCorrientesDto, RegistrarPagoDto } from '../dto/cuenta-corriente.dto';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../enums/tipo-movimiento-cta-corriente.enum';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../repositories/interfaces/cuentas-corrientes-repository.interface';
import {
  IMovimientosCtaCorrienteRepository,
  MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY,
} from '../repositories/interfaces/movimientos-cta-corriente-repository.interface';

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
    @Inject(MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY)
    private readonly movimientosRepository: IMovimientosCtaCorrienteRepository,
    private readonly dataSource: DataSource,
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
        existing.saldoFavor = 0;
        existing.limiteCredito = dto.limiteCredito ?? 0;
        await this.repository.save(existing);
        return this.toResponse(await this.requireCuenta(existing.idCuentaCorriente));
      }

      const numeroCuenta = await this.repository.generateNextNumber();
      const cuenta = this.repository.create({
        numeroCuenta,
        saldo: 0,
        saldoFavor: 0,
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

  /** Cuenta del cliente junto con su historial de movimientos (más recientes primero). */
  async findHistorialByCliente(idCliente: number) {
    const cuenta = await this.requireCuentaDeCliente(idCliente);
    const movimientos = await this.movimientosRepository.findByCuenta(cuenta.idCuentaCorriente);
    return {
      cuenta: this.toResponse(cuenta),
      movimientos: movimientos.map((movimiento) => this.toMovimientoResponse(movimiento)),
    };
  }

  /**
   * Pago manual imputado sobre la cuenta corriente: registra un MovimientoCtaCorriente
   * de tipo COBRO_CUENTA (monto siempre positivo, según el CHECK de la tabla) y
   * descuenta el saldo de forma atómica.
   */
  async registrarPago(idCliente: number, dto: RegistrarPagoDto, idEmpleado: number | null) {
    const cuentaActual = await this.requireCuentaDeCliente(idCliente);
    if (!cuentaActual.activa) {
      throw new ConflictException('No se pueden registrar pagos sobre una cuenta corriente inactiva.');
    }

    const movimiento = await this.dataSource.transaction(async (manager) => {
      const cuentasRepository = manager.getRepository(CuentaCorriente);
      const movimientosRepository = manager.getRepository(MovimientoCtaCorriente);

      // Bloqueo pesimista por PK: el filtro debe ser sobre la clave primaria, nunca
      // sobre la relación `cliente`, porque el LEFT JOIN resultante rompe el FOR UPDATE.
      const cuenta = await cuentasRepository.findOne({
        where: { idCuentaCorriente: cuentaActual.idCuentaCorriente },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cuenta) throw new NotFoundException('Cuenta corriente no encontrada.');

      const saldo = this.redondear(Number(cuenta.saldo));
      const monto = this.redondear(Number(dto.monto));
      if (monto > saldo) {
        throw new BadRequestException(
          `El pago de $${monto.toFixed(2)} supera el saldo pendiente de $${saldo.toFixed(2)}.`,
        );
      }

      const saldoPosterior = this.redondear(saldo - monto);
      const descripcion = idEmpleado === null
        ? (dto.observaciones ?? 'Pago manual registrado por administración.')
        : `${dto.observaciones ?? 'Pago manual registrado por administración.'} (legajo empleado #${idEmpleado})`;
      const guardado = await movimientosRepository.save(
        movimientosRepository.create({
          cuentaCorriente: cuenta,
          tipo: TipoMovimientoCtaCorriente.COBRO_CUENTA,
          monto,
          saldoPosterior,
          saldoFavorPosterior: Number(cuenta.saldoFavor) || 0,
          venta: null,
          descripcion,
        }),
      );

      cuenta.saldo = saldoPosterior;
      await cuentasRepository.save(cuenta);
      return guardado;
    });

    return {
      cuenta: this.toResponse(await this.requireCuenta(cuentaActual.idCuentaCorriente)),
      movimiento: this.toMovimientoResponse(movimiento),
    };
  }

  async remove(id: number): Promise<void> {
    const cuenta = await this.requireCuenta(id);
    if (!cuenta.activa) throw new NotFoundException('Cuenta corriente no encontrada o inactiva.');
    if (Number(cuenta.saldo) !== 0 || Number(cuenta.saldoFavor) !== 0) {
      throw new ConflictException('No se puede dar de baja una cuenta con deuda o saldo a favor pendiente.');
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

  /** Cuenta del cliente con todas sus relaciones cargadas para armar la respuesta. */
  private async requireCuentaDeCliente(idCliente: number): Promise<CuentaCorriente> {
    const cuenta = await this.repository.findByClienteId(idCliente);
    if (!cuenta) throw new NotFoundException('El cliente no tiene una cuenta corriente asociada.');
    return this.requireCuenta(cuenta.idCuentaCorriente);
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private toResponse(cuenta: CuentaCorriente) {
    const limiteCredito = Number(cuenta.limiteCredito) || 0;
    const deuda = Number(cuenta.saldo) || 0;
    const saldoFavor = Number(cuenta.saldoFavor) || 0;
    return {
      idCuentaCorriente: cuenta.idCuentaCorriente,
      numeroCuenta: cuenta.numeroCuenta,
      saldo: saldoFavor,
      deuda,
      saldoFavor,
      limiteCredito,
      creditoDisponible: limiteCredito > 0 ? Math.max(0, limiteCredito - deuda) : null,
      estado: cuenta.activa ? 'ACTIVA' : 'INACTIVA',
      fechaAlta: cuenta.fechaAlta,
      fechaBaja: cuenta.fechaBaja,
      cliente: this.toClienteSummary(cuenta.cliente),
    };
  }

  private toMovimientoResponse(movimiento: MovimientoCtaCorriente) {
    return {
      idMovimientoCtaCte: movimiento.idMovimientoCtaCte,
      tipo: movimiento.tipo,
      monto: Number(movimiento.monto),
      saldoPosterior: Number(movimiento.saldoPosterior),
      deudaPosterior: Number(movimiento.saldoPosterior),
      saldoFavorPosterior: Number(movimiento.saldoFavorPosterior) || 0,
      fecha: movimiento.fecha,
      idVenta: movimiento.venta?.idVenta ?? null,
      observaciones: movimiento.descripcion,
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
