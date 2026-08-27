import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateSectorDto, UpdateSectorDto } from '../dto/catalogo.dto';
import { Deposito } from '../entities/deposito.entity';
import { Estante } from '../entities/estante.entity';
import { Sector } from '../entities/sector.entity';

@Injectable()
export class SectoresService {
  constructor(
    @InjectRepository(Sector) private readonly repository: Repository<Sector>,
    @InjectRepository(Deposito) private readonly depositosRepository: Repository<Deposito>,
    @InjectRepository(Estante) private readonly estantesRepository: Repository<Estante>,
  ) {}

  findAll(depositoId?: number) {
    return this.repository.find({
      where: depositoId ? { deposito: { idDeposito: depositoId } } : {},
      relations: { deposito: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number) {
    const sector = await this.repository.findOne({ where: { idSector: id }, relations: { deposito: true } });
    if (!sector) throw new NotFoundException('Sector no encontrado.');
    return sector;
  }

  private async findDeposito(id: number) {
    const deposito = await this.depositosRepository.findOneBy({ idDeposito: id });
    if (!deposito) throw new NotFoundException('Depósito no encontrado o inactivo.');
    return deposito;
  }

  async create(dto: CreateSectorDto) {
    const deposito = await this.findDeposito(dto.depositoId);
    try {
      return await this.repository.save(this.repository.create({ nombre: dto.nombre.trim(), deposito }));
    } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async update(id: number, dto: UpdateSectorDto) {
    const sector = await this.findOne(id);
    if (dto.nombre) sector.nombre = dto.nombre.trim();
    if (dto.depositoId) sector.deposito = await this.findDeposito(dto.depositoId);
    try { return await this.repository.save(sector); } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async remove(id: number) {
    const sector = await this.findOne(id);
    if (await this.estantesRepository.count({ where: { sector: { idSector: id } } })) {
      throw new ConflictException('No se puede eliminar un sector con estantes activos.');
    }
    await this.repository.softRemove(sector);
  }
}
