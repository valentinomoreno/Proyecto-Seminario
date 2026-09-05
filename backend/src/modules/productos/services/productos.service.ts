import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateProductoDto, QueryProductosDto, UpdateProductoDto } from '../dto/producto.dto';
import { Producto } from '../entities/producto.entity';
import { CATEGORIAS_REPOSITORY, ICategoriasRepository } from '../repositories/interfaces/categorias-repository.interface';
import { ESTANTES_REPOSITORY, IEstantesRepository } from '../repositories/interfaces/estantes-repository.interface';
import { IMarcasRepository, MARCAS_REPOSITORY } from '../repositories/interfaces/marcas-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from '../repositories/interfaces/productos-repository.interface';

@Injectable()
export class ProductosService {
  constructor(
    @Inject(PRODUCTOS_REPOSITORY) private readonly repository: IProductosRepository,
    @Inject(CATEGORIAS_REPOSITORY) private readonly categoriasRepository: ICategoriasRepository,
    @Inject(MARCAS_REPOSITORY) private readonly marcasRepository: IMarcasRepository,
    @Inject(ESTANTES_REPOSITORY) private readonly estantesRepository: IEstantesRepository,
  ) {}

  async findAll(query: QueryProductosDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const [productos, total] = await this.repository.findAndCount(query);

    return {
      data: productos.map((producto) => this.toResponse(producto)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const producto = await this.repository.findById(id);
    if (!producto) throw new NotFoundException('Producto no encontrado.');
    return this.toResponse(producto);
  }

  private async findReferences(categoriaId: number, marcaId: number, estanteId: number) {
    const [categoria, marca, estante] = await Promise.all([
      this.categoriasRepository.findById(categoriaId),
      this.marcasRepository.findById(marcaId),
      this.estantesRepository.findById(estanteId),
    ]);
    if (!categoria) throw new NotFoundException('Categoría no encontrada o inactiva.');
    if (!marca) throw new NotFoundException('Marca no encontrada o inactiva.');
    if (!estante) throw new NotFoundException('Estante no encontrado o inactivo.');
    return { categoria, marca, estante };
  }

  async create(dto: CreateProductoDto) {
    const references = await this.findReferences(dto.categoriaId, dto.marcaId, dto.estanteId);
    const sku = await this.repository.generateNextSku();
    const producto = this.repository.create({
      sku,
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion.trim(),
      stock: dto.stock,
      precioUnitario: dto.precioUnitario,
      imagenUrl: dto.imagenUrl?.trim() || null,
      ...references,
    });
    try {
      return this.toResponse(await this.repository.save(producto));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async update(id: number, dto: UpdateProductoDto) {
    const producto = await this.repository.findById(id);
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    if (dto.nombre !== undefined) producto.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) producto.descripcion = dto.descripcion.trim();
    if (dto.stock !== undefined) producto.stock = dto.stock;
    if (dto.precioUnitario !== undefined) producto.precioUnitario = dto.precioUnitario;
    if (dto.imagenUrl !== undefined) producto.imagenUrl = dto.imagenUrl?.trim() || null;

    if (dto.categoriaId !== undefined || dto.marcaId !== undefined || dto.estanteId !== undefined) {
      const references = await this.findReferences(
        dto.categoriaId ?? producto.categoria.idCategoria,
        dto.marcaId ?? producto.marca.idMarca,
        dto.estanteId ?? producto.estante.idEstante,
      );
      Object.assign(producto, references);
    }

    try {
      return this.toResponse(await this.repository.save(producto));
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  async remove(id: number) {
    const producto = await this.repository.findById(id);
    if (!producto) throw new NotFoundException('Producto no encontrado.');
    await this.repository.softRemove(producto);
  }

  private toResponse(producto: Producto) {
    return {
      idProducto: producto.idProducto,
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      stock: producto.stock,
      precioUnitario: producto.precioUnitario,
      imagenUrl: producto.imagenUrl ?? null,
      categoria: {
        idCategoria: producto.categoria.idCategoria,
        nombre: producto.categoria.nombre,
      },
      marca: {
        idMarca: producto.marca.idMarca,
        nombre: producto.marca.nombre,
      },
      ubicacion: {
        deposito: {
          idDeposito: producto.estante.sector.deposito.idDeposito,
          nombre: producto.estante.sector.deposito.nombre,
        },
        sector: {
          idSector: producto.estante.sector.idSector,
          nombre: producto.estante.sector.nombre,
        },
        estante: {
          idEstante: producto.estante.idEstante,
          codigo: producto.estante.codigo,
        },
      },
    };
  }
}
