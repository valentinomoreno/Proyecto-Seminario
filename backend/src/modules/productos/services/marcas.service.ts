import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateMarcaDto, UpdateMarcaDto } from '../dto/catalogo.dto';
import { IMarcasRepository, MARCAS_REPOSITORY } from '../repositories/interfaces/marcas-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from '../repositories/interfaces/productos-repository.interface';

@Injectable()
export class MarcasService {
  constructor(
    @Inject(MARCAS_REPOSITORY) private readonly repository: IMarcasRepository,
    @Inject(PRODUCTOS_REPOSITORY) private readonly productosRepository: IProductosRepository,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const marca = await this.repository.findById(id);
    if (!marca) throw new NotFoundException('Marca no encontrada.');
    return marca;
  }

  async create(dto: CreateMarcaDto) {
    try {
      return await this.repository.save(this.repository.create({ nombre: dto.nombre.trim() }));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateMarcaDto) {
    const marca = await this.findOne(id);
    if (dto.nombre) marca.nombre = dto.nombre.trim();
    try {
      return await this.repository.save(marca);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const marca = await this.findOne(id);
    if (await this.productosRepository.countByMarca(id)) {
      throw new ConflictException('No se puede eliminar una marca con productos activos.');
    }
    await this.repository.softRemove(marca);
  }
}
