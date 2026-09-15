import { QueryDevolucionesDto } from '../../dto/devolucion.dto';
import { Devolucion } from '../../entities/devolucion.entity';

export const DEVOLUCIONES_REPOSITORY = Symbol('DEVOLUCIONES_REPOSITORY');

export interface IDevolucionesRepository {
  findAndCount(query: QueryDevolucionesDto): Promise<[Devolucion[], number]>;
  findById(id: number): Promise<Devolucion | null>;
}
