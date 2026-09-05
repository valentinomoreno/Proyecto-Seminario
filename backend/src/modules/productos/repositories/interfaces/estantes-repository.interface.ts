import { Estante } from '../../entities/estante.entity';

export const ESTANTES_REPOSITORY = Symbol('ESTANTES_REPOSITORY');

export interface IEstantesRepository {
  findAll(sectorId?: number): Promise<Estante[]>;
  findById(id: number): Promise<Estante | null>;
  create(data: Partial<Estante>): Estante;
  save(estante: Estante): Promise<Estante>;
  softRemove(estante: Estante): Promise<Estante>;
  countBySector(sectorId: number): Promise<number>;
}
