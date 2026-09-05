import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateEstanteDto, UpdateEstanteDto } from '../dto/catalogo.dto';
import { ESTANTES_REPOSITORY, IEstantesRepository } from '../repositories/interfaces/estantes-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from '../repositories/interfaces/productos-repository.interface';
import { ISectoresRepository, SECTORES_REPOSITORY } from '../repositories/interfaces/sectores-repository.interface';

@Injectable()
export class EstantesService {
  constructor(
    @Inject(ESTANTES_REPOSITORY) private readonly repository: IEstantesRepository,
    @Inject(SECTORES_REPOSITORY) private readonly sectoresRepository: ISectoresRepository,
    @Inject(PRODUCTOS_REPOSITORY) private readonly productosRepository: IProductosRepository,
  ) {}

  findAll(sectorId?: number) {
    return this.repository.findAll(sectorId);
  }

  async findOne(id: number) {
    const estante = await this.repository.findById(id);
    if (!estante) throw new NotFoundException('Estante no encontrado.');
    return estante;
  }

  private async findSector(id: number) {
    const sector = await this.sectoresRepository.findById(id);
    if (!sector) throw new NotFoundException('Sector no encontrado o inactivo.');
    return sector;
  }

  async create(dto: CreateEstanteDto) {
    const sector = await this.findSector(dto.sectorId);
    try {
      return await this.repository.save(this.repository.create({
        codigo: dto.codigo.trim(),
        descripcion: dto.descripcion?.trim() || null,
        sector,
      }));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateEstanteDto) {
    const estante = await this.findOne(id);
    if (dto.codigo) estante.codigo = dto.codigo.trim();
    if (dto.descripcion !== undefined) estante.descripcion = dto.descripcion.trim() || null;
    if (dto.sectorId) estante.sector = await this.findSector(dto.sectorId);
    try {
      return await this.repository.save(estante);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const estante = await this.findOne(id);
    if (await this.productosRepository.countByEstante(id)) {
      throw new ConflictException('No se puede eliminar un estante con productos activos.');
    }
    await this.repository.softRemove(estante);
  }
}
