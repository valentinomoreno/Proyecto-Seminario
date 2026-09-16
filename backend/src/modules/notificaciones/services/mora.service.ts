import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../../cuentas-corrientes/entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-corriente.enum';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../../cuentas-corrientes/repositories/interfaces/cuentas-corrientes-repository.interface';
import {
  IMovimientosCtaCorrienteRepository,
  MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY,
} from '../../cuentas-corrientes/repositories/interfaces/movimientos-cta-corriente-repository.interface';
import { DIA_INICIO_MORA, TASA_MORA_MENSUAL, ZONA_HORARIA_NEGOCIO } from '../notificaciones.constants';

export interface ResumenMora {
  aplicadas: number;
  omitidas: number;
}

/**
 * Proceso 2 de RNF-14: a partir del día 8 de cada mes se recarga el 10% sobre el
 * saldo deudor impago, registrando un MovimientoCtaCte de tipo MORA y
 * actualizando el saldo de forma atómica.
 */
@Injectable()
export class MoraService {
  private readonly logger = new Logger(MoraService.name);

  constructor(
    @Inject(CUENTAS_CORRIENTES_REPOSITORY) private readonly cuentasRepository: ICuentasCorrientesRepository,
    @Inject(MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY) private readonly movimientosRepository: IMovimientosCtaCorrienteRepository,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 9 * * *', { timeZone: ZONA_HORARIA_NEGOCIO })
  async aplicarMoraProgramada(): Promise<void> {
    const resumen = await this.ejecutar();
    this.logger.log(`Mora: ${resumen.aplicadas} aplicadas, ${resumen.omitidas} omitidas.`);
  }

  /** Público para poder testearlo y dispararlo manualmente desde el controlador de debug. */
  async ejecutar(referencia: Date = new Date()): Promise<ResumenMora> {
    if (referencia.getDate() < DIA_INICIO_MORA) {
      this.logger.log(`Antes del día ${DIA_INICIO_MORA}: no corresponde aplicar mora.`);
      return { aplicadas: 0, omitidas: 0 };
    }

    const primerDiaDelMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1, 0, 0, 0, 0);
    const cuentas = await this.cuentasRepository.findConSaldoDeudor();
    let aplicadas = 0;
    let omitidas = 0;

    for (const cuenta of cuentas) {
      if (Number(cuenta.saldo) <= 0) {
        omitidas += 1;
        continue;
      }

      // Idempotencia mensual: una sola mora por cuenta y por mes calendario.
      const yaTieneMora = await this.movimientosRepository.existeMoraEnMes(cuenta.idCuentaCorriente, primerDiaDelMes);
      if (yaTieneMora) {
        omitidas += 1;
        continue;
      }

      const aplicada = await this.aplicarMoraACuenta(cuenta.idCuentaCorriente);
      if (aplicada) {
        aplicadas += 1;
      } else {
        omitidas += 1;
      }
    }

    return { aplicadas, omitidas };
  }

  private aplicarMoraACuenta(idCuentaCorriente: number): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const cuentasRepository = manager.getRepository(CuentaCorriente);
      const movimientosRepository = manager.getRepository(MovimientoCtaCorriente);

      // Bloqueo pesimista por PK: el filtro debe ser sobre la clave primaria, nunca
      // sobre la relación `cliente`, porque el LEFT JOIN resultante rompe el FOR UPDATE.
      const cuenta = await cuentasRepository.findOne({
        where: { idCuentaCorriente },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cuenta) return false;

      const saldo = this.redondear(Number(cuenta.saldo));
      if (saldo <= 0) return false;

      const recargo = this.redondear(saldo * TASA_MORA_MENSUAL);
      if (recargo <= 0) return false;

      const saldoPosterior = this.redondear(saldo + recargo);

      const movimiento = movimientosRepository.create({
        cuentaCorriente: cuenta,
        tipo: TipoMovimientoCtaCorriente.MORA,
        monto: recargo,
        saldoPosterior,
        saldoFavorPosterior: Number(cuenta.saldoFavor) || 0,
        venta: null,
        descripcion: `Mora automática del ${(TASA_MORA_MENSUAL * 100).toFixed(0)}% sobre el saldo impago.`,
      });
      await movimientosRepository.save(movimiento);

      cuenta.saldo = saldoPosterior;
      await cuentasRepository.save(cuenta);

      return true;
    });
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
