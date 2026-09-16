import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateMarcaDto, UpdateMarcaDto } from '../dto/catalogo.dto';
import { IMarcasRepository, MARCAS_REPOSITORY } from '../repositories/interfaces/marcas-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from '../repositories/interfaces/productos-repository.interface';
import {
  CATEGORIAS_REPOSITORY,
  ICategoriasRepository,
} from '../repositories/interfaces/categorias-repository.interface';

@Injectable()
export class MarcasService {
  constructor(
    @Inject(MARCAS_REPOSITORY) private readonly repository: IMarcasRepository,
    @Inject(PRODUCTOS_REPOSITORY) private readonly productosRepository: IProductosRepository,
    @Inject(CATEGORIAS_REPOSITORY) private readonly categoriasRepository: ICategoriasRepository,
  ) {}

  findAll(categoriaId?: number) {
    return this.repository.findAll(categoriaId);
  }

  async findOne(id: number) {
    const marca = await this.repository.findById(id);
    if (!marca) throw new NotFoundException('Marca no encontrada.');
    return marca;
  }

  async create(dto: CreateMarcaDto) {
    await this.validarCategorias(dto.categoriaIds);
    try {
      const marca = await this.repository.save(this.repository.create({ nombre: dto.nombre.trim() }));
      await this.repository.setCategorias(marca.idMarca, dto.categoriaIds);
      return this.findOne(marca.idMarca);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateMarcaDto) {
    const marca = await this.findOne(id);
    if (dto.categoriaIds) await this.validarCategorias(dto.categoriaIds);
    if (dto.nombre) marca.nombre = dto.nombre.trim();
    try {
      const guardada = await this.repository.save(marca);
      if (dto.categoriaIds) await this.repository.setCategorias(id, dto.categoriaIds);
      return this.findOne(guardada.idMarca);
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

  private async validarCategorias(ids: number[]) {
    const categorias = await this.categoriasRepository.findByIds(ids);
    if (categorias.length !== ids.length) {
      throw new BadRequestException('Una o más categorías seleccionadas no existen.');
    }
  }
}
