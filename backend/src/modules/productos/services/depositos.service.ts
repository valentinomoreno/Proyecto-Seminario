import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateDepositoDto, UpdateDepositoDto } from '../dto/catalogo.dto';
import { DEPOSITOS_REPOSITORY, IDepositosRepository } from '../repositories/interfaces/depositos-repository.interface';
import { ISectoresRepository, SECTORES_REPOSITORY } from '../repositories/interfaces/sectores-repository.interface';

@Injectable()
export class DepositosService {
  constructor(
    @Inject(DEPOSITOS_REPOSITORY) private readonly repository: IDepositosRepository,
    @Inject(SECTORES_REPOSITORY) private readonly sectoresRepository: ISectoresRepository,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const deposito = await this.repository.findById(id);
    if (!deposito) throw new NotFoundException('Depósito no encontrado.');
    return deposito;
  }

  async create(dto: CreateDepositoDto) {
    try {
      return await this.repository.save(this.repository.create({
        nombre: dto.nombre.trim(),
        direccion: dto.direccion?.trim() || null,
      }));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateDepositoDto) {
    const deposito = await this.findOne(id);
    if (dto.nombre) deposito.nombre = dto.nombre.trim();
    if (dto.direccion !== undefined) deposito.direccion = dto.direccion.trim() || null;
    try {
      return await this.repository.save(deposito);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const deposito = await this.findOne(id);
    if (await this.sectoresRepository.countByDeposito(id)) {
      throw new ConflictException('No se puede eliminar un depósito con sectores activos.');
    }
    await this.repository.softRemove(deposito);
  }
}
