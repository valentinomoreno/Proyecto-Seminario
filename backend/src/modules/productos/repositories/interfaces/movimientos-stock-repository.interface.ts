import { MovimientoStock } from '../../entities/movimiento-stock.entity';

export const MOVIMIENTOS_STOCK_REPOSITORY = Symbol('MOVIMIENTOS_STOCK_REPOSITORY');

export interface IMovimientosStockRepository {
  findByProducto(idProducto: number): Promise<MovimientoStock[]>;
  create(data: Partial<MovimientoStock>): MovimientoStock;
  save(movimiento: MovimientoStock): Promise<MovimientoStock>;
}
