import { MovimientoCtaCorriente } from '../../entities/movimiento-cta-corriente.entity';

export const MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY = Symbol('MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY');

export interface IMovimientosCtaCorrienteRepository {
  findByCuenta(idCuentaCorriente: number): Promise<MovimientoCtaCorriente[]>;
  existeMoraEnMes(idCuentaCorriente: number, desde: Date): Promise<boolean>;
}
