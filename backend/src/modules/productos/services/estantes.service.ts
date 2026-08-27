import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateEstanteDto, UpdateEstanteDto } from '../dto/catalogo.dto';
import { Estante } from '../entities/estante.entity';
import { Producto } from '../entities/producto.entity';
import { Sector } from '../entities/sector.entity';

@Injectable()
export class EstantesService {
  constructor(
    @InjectRepository(Estante) private readonly repository: Repository<Estante>,
    @InjectRepository(Sector) private readonly sectoresRepository: Repository<Sector>,
    @InjectRepository(Producto) private readonly productosRepository: Repository<Producto>,
  ) {}

  findAll(sectorId?: number) {
    return this.repository.find({
      where: sectorId ? { sector: { idSector: sectorId } } : {},
      relations: { sector: { deposito: true } },
      order: { codigo: 'ASC' },
    });
  }

  async findOne(id: number) {
    const estante = await this.repository.findOne({
      where: { idEstante: id },
      relations: { sector: { deposito: true } },
    });
    if (!estante) throw new NotFoundException('Estante no encontrado.');
    return estante;
  }

  private async findSector(id: number) {
    const sector = await this.sectoresRepository.findOne({
      where: { idSector: id },
      relations: { deposito: true },
    });
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
    } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async update(id: number, dto: UpdateEstanteDto) {
    const estante = await this.findOne(id);
    if (dto.codigo) estante.codigo = dto.codigo.trim();
    if (dto.descripcion !== undefined) estante.descripcion = dto.descripcion.trim() || null;
    if (dto.sectorId) estante.sector = await this.findSector(dto.sectorId);
    try { return await this.repository.save(estante); } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async remove(id: number) {
    const estante = await this.findOne(id);
    if (await this.productosRepository.count({ where: { estante: { idEstante: id } } })) {
      throw new ConflictException('No se puede eliminar un estante con productos activos.');
    }
    await this.repository.softRemove(estante);
  }
}
