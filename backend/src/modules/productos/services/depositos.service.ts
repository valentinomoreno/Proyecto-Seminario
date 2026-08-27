import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateDepositoDto, UpdateDepositoDto } from '../dto/catalogo.dto';
import { Deposito } from '../entities/deposito.entity';
import { Sector } from '../entities/sector.entity';

@Injectable()
export class DepositosService {
  constructor(
    @InjectRepository(Deposito) private readonly repository: Repository<Deposito>,
    @InjectRepository(Sector) private readonly sectoresRepository: Repository<Sector>,
  ) {}

  findAll() { return this.repository.find({ order: { nombre: 'ASC' } }); }

  async findOne(id: number) {
    const deposito = await this.repository.findOneBy({ idDeposito: id });
    if (!deposito) throw new NotFoundException('Depósito no encontrado.');
    return deposito;
  }

  async create(dto: CreateDepositoDto) {
    try {
      return await this.repository.save(this.repository.create({
        nombre: dto.nombre.trim(),
        direccion: dto.direccion?.trim() || null,
      }));
    } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async update(id: number, dto: UpdateDepositoDto) {
    const deposito = await this.findOne(id);
    if (dto.nombre) deposito.nombre = dto.nombre.trim();
    if (dto.direccion !== undefined) deposito.direccion = dto.direccion.trim() || null;
    try { return await this.repository.save(deposito); } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async remove(id: number) {
    const deposito = await this.findOne(id);
    if (await this.sectoresRepository.count({ where: { deposito: { idDeposito: id } } })) {
      throw new ConflictException('No se puede eliminar un depósito con sectores activos.');
    }
    await this.repository.softRemove(deposito);
  }
}
