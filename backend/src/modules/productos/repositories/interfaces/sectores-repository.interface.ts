import { Sector } from '../../entities/sector.entity';

export const SECTORES_REPOSITORY = Symbol('SECTORES_REPOSITORY');

export interface ISectoresRepository {
  findAll(depositoId?: number): Promise<Sector[]>;
  findById(id: number): Promise<Sector | null>;
  create(data: Partial<Sector>): Sector;
  save(sector: Sector): Promise<Sector>;
  softRemove(sector: Sector): Promise<Sector>;
  countByDeposito(depositoId: number): Promise<number>;
}
