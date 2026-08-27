import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateMarcaDto, UpdateMarcaDto } from '../dto/catalogo.dto';
import { Marca } from '../entities/marca.entity';
import { Producto } from '../entities/producto.entity';

@Injectable()
export class MarcasService {
  constructor(
    @InjectRepository(Marca) private readonly repository: Repository<Marca>,
    @InjectRepository(Producto) private readonly productosRepository: Repository<Producto>,
  ) {}

  findAll() { return this.repository.find({ order: { nombre: 'ASC' } }); }

  async findOne(id: number) {
    const marca = await this.repository.findOneBy({ idMarca: id });
    if (!marca) throw new NotFoundException('Marca no encontrada.');
    return marca;
  }

  async create(dto: CreateMarcaDto) {
    try {
      return await this.repository.save(this.repository.create({ nombre: dto.nombre.trim() }));
    } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async update(id: number, dto: UpdateMarcaDto) {
    const marca = await this.findOne(id);
    if (dto.nombre) marca.nombre = dto.nombre.trim();
    try { return await this.repository.save(marca); } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async remove(id: number) {
    const marca = await this.findOne(id);
    if (await this.productosRepository.count({ where: { marca: { idMarca: id } } })) {
      throw new ConflictException('No se puede eliminar una marca con productos activos.');
    }
    await this.repository.softRemove(marca);
  }
}
