import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { RegistrarPagoDto } from '../dto/cuenta-corriente.dto';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { MovimientoCtaCte } from '../entities/movimiento-cta-cte.entity';
import { TipoMovimientoCtaCte } from '../enums/tipo-movimiento-cta-cte.enum';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../repositories/interfaces/cuentas-corrientes-repository.interface';
import {
  IMovimientosCtaCteRepository,
  MOVIMIENTOS_CTA_CTE_REPOSITORY,
} from '../repositories/interfaces/movimientos-cta-cte-repository.interface';

@Injectable()
export class CuentasCorrientesService {
  constructor(
    @Inject(CUENTAS_CORRIENTES_REPOSITORY) private readonly repository: ICuentasCorrientesRepository,
    @Inject(MOVIMIENTOS_CTA_CTE_REPOSITORY) private readonly movimientosRepository: IMovimientosCtaCteRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    const cuentas = await this.repository.findAll();
    return cuentas.map((cuenta) => this.toResponse(cuenta));
  }

  async findByCliente(idCliente: number) {
    const cuenta = await this.repository.findByCliente(idCliente);
    if (!cuenta) throw new NotFoundException('Cuenta corriente no encontrada.');

    const movimientos = await this.movimientosRepository.findByCuenta(cuenta.idCuentaCorriente);

    return {
      ...this.toResponse(cuenta),
      movimientos: movimientos.map((movimiento) => this.toMovimientoResponse(movimiento)),
    };
  }

  async registrarPago(idCliente: number, dto: RegistrarPagoDto, idEmpleado: number | null) {
    const cuenta = await this.repository.findByCliente(idCliente);
    if (!cuenta) throw new NotFoundException('Cuenta corriente no encontrada.');

    return this.dataSource.transaction(async (manager) => {
      const cuentasRepository = manager.getRepository(CuentaCorriente);
      const movimientosRepository = manager.getRepository(MovimientoCtaCte);

      // Bloqueo pesimista: evita carreras con el cron de mora sobre el mismo saldo.
      const cuentaBloqueada = await cuentasRepository.findOne({
        where: { idCuentaCorriente: cuenta.idCuentaCorriente },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cuentaBloqueada) throw new NotFoundException('Cuenta corriente no encontrada.');

      const saldoActual = this.redondear(Number(cuentaBloqueada.saldo));
      const monto = this.redondear(dto.monto);

      if (monto > saldoActual) {
        throw new BadRequestException(
          `El pago de $${monto.toFixed(2)} supera el saldo adeudado de $${saldoActual.toFixed(2)}.`,
        );
      }

      const saldoResultante = this.redondear(saldoActual - monto);

      const movimiento = movimientosRepository.create({
        cuentaCorriente: cuentaBloqueada,
        tipo: TipoMovimientoCtaCte.PAGO,
        monto: -monto,
        saldoResultante,
        idVenta: null,
        empleado: idEmpleado !== null ? { idEmpleado } : null,
        observaciones: dto.observaciones?.trim() || null,
      });

      try {
        const movimientoGuardado = await movimientosRepository.save(movimiento);

        cuentaBloqueada.saldo = saldoResultante;
        cuentaBloqueada.fechaUltimoMovimiento = new Date();
        const cuentaActualizada = await cuentasRepository.save(cuentaBloqueada);
        cuentaActualizada.cliente = cuenta.cliente;

        return {
          ...this.toResponse(cuentaActualizada),
          movimiento: this.toMovimientoResponse(movimientoGuardado),
        };
      } catch (error) {
        throwFriendlyDatabaseError(error);
      }
    });
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private toResponse(cuenta: CuentaCorriente) {
    return {
      idCuentaCorriente: cuenta.idCuentaCorriente,
      saldo: cuenta.saldo,
      fechaUltimoMovimiento: cuenta.fechaUltimoMovimiento ?? null,
      cliente: {
        idCliente: cuenta.cliente.idCliente,
        nombre: cuenta.cliente.nombre,
        apellido: cuenta.cliente.apellido,
        email: cuenta.cliente.email,
      },
    };
  }

  private toMovimientoResponse(movimiento: MovimientoCtaCte) {
    return {
      idMovimientoCtaCte: movimiento.idMovimientoCtaCte,
      tipo: movimiento.tipo,
      monto: movimiento.monto,
      saldoResultante: movimiento.saldoResultante,
      fecha: movimiento.fecha,
      observaciones: movimiento.observaciones ?? null,
    };
  }
}
