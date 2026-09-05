import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/catalogo.dto';
import { CATEGORIAS_REPOSITORY, ICategoriasRepository } from '../repositories/interfaces/categorias-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from '../repositories/interfaces/productos-repository.interface';

@Injectable()
export class CategoriasService {
  constructor(
    @Inject(CATEGORIAS_REPOSITORY) private readonly repository: ICategoriasRepository,
    @Inject(PRODUCTOS_REPOSITORY) private readonly productosRepository: IProductosRepository,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const categoria = await this.repository.findById(id);
    if (!categoria) throw new NotFoundException('Categoría no encontrada.');
    return categoria;
  }

  async create(dto: CreateCategoriaDto) {
    try {
      return await this.repository.save(this.repository.create({ ...dto, nombre: dto.nombre.trim() }));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateCategoriaDto) {
    const categoria = await this.findOne(id);
    Object.assign(categoria, dto, dto.nombre ? { nombre: dto.nombre.trim() } : {});
    try {
      return await this.repository.save(categoria);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const categoria = await this.findOne(id);
    if (await this.productosRepository.countByCategoria(id)) {
      throw new ConflictException('No se puede eliminar una categoría con productos activos.');
    }
    await this.repository.softRemove(categoria);
  }
}
