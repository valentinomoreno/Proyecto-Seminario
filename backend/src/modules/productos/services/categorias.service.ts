import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/catalogo.dto';
import { Categoria } from '../entities/categoria.entity';
import { Producto } from '../entities/producto.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria) private readonly repository: Repository<Categoria>,
    @InjectRepository(Producto) private readonly productosRepository: Repository<Producto>,
  ) {}

  findAll() {
    return this.repository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const categoria = await this.repository.findOneBy({ idCategoria: id });
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
    if (await this.productosRepository.count({ where: { categoria: { idCategoria: id } } })) {
      throw new ConflictException('No se puede eliminar una categoría con productos activos.');
    }
    await this.repository.softRemove(categoria);
  }
}
