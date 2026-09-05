import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateSectorDto, UpdateSectorDto } from '../dto/catalogo.dto';
import { DEPOSITOS_REPOSITORY, IDepositosRepository } from '../repositories/interfaces/depositos-repository.interface';
import { ESTANTES_REPOSITORY, IEstantesRepository } from '../repositories/interfaces/estantes-repository.interface';
import { ISectoresRepository, SECTORES_REPOSITORY } from '../repositories/interfaces/sectores-repository.interface';

@Injectable()
export class SectoresService {
  constructor(
    @Inject(SECTORES_REPOSITORY) private readonly repository: ISectoresRepository,
    @Inject(DEPOSITOS_REPOSITORY) private readonly depositosRepository: IDepositosRepository,
    @Inject(ESTANTES_REPOSITORY) private readonly estantesRepository: IEstantesRepository,
  ) {}

  findAll(depositoId?: number) {
    return this.repository.findAll(depositoId);
  }

  async findOne(id: number) {
    const sector = await this.repository.findById(id);
    if (!sector) throw new NotFoundException('Sector no encontrado.');
    return sector;
  }

  private async findDeposito(id: number) {
    const deposito = await this.depositosRepository.findById(id);
    if (!deposito) throw new NotFoundException('Depósito no encontrado o inactivo.');
    return deposito;
  }

  async create(dto: CreateSectorDto) {
    const deposito = await this.findDeposito(dto.depositoId);
    try {
      return await this.repository.save(this.repository.create({ nombre: dto.nombre.trim(), deposito }));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateSectorDto) {
    const sector = await this.findOne(id);
    if (dto.nombre) sector.nombre = dto.nombre.trim();
    if (dto.depositoId) sector.deposito = await this.findDeposito(dto.depositoId);
    try {
      return await this.repository.save(sector);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const sector = await this.findOne(id);
    if (await this.estantesRepository.countBySector(id)) {
      throw new ConflictException('No se puede eliminar un sector con estantes activos.');
    }
    await this.repository.softRemove(sector);
  }
}
