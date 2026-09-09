import { QueryVentasDto } from '../../dto/venta.dto';
import { Venta } from '../../entities/venta.entity';

export const VENTAS_REPOSITORY = Symbol('VENTAS_REPOSITORY');

export interface IVentasRepository {
  findAndCount(query: QueryVentasDto): Promise<[Venta[], number]>;
  findById(id: number): Promise<Venta | null>;
  findByNumeroComprobante(numeroComprobante: string): Promise<Venta | null>;
}
