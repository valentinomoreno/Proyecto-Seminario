import { MovimientoCtaCte } from '../../entities/movimiento-cta-cte.entity';

export const MOVIMIENTOS_CTA_CTE_REPOSITORY = Symbol('MOVIMIENTOS_CTA_CTE_REPOSITORY');

export interface IMovimientosCtaCteRepository {
  findByCuenta(idCuentaCorriente: number): Promise<MovimientoCtaCte[]>;
  existeMoraEnMes(idCuentaCorriente: number, desde: Date): Promise<boolean>;
  create(data: Partial<MovimientoCtaCte>): MovimientoCtaCte;
  save(movimiento: MovimientoCtaCte): Promise<MovimientoCtaCte>;
}
