import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { CreateProductoDto, QueryProductosDto, UpdateProductoDto } from '../dto/producto.dto';
import { Categoria } from '../entities/categoria.entity';
import { Estante } from '../entities/estante.entity';
import { Marca } from '../entities/marca.entity';
import { Producto } from '../entities/producto.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto) private readonly repository: Repository<Producto>,
    @InjectRepository(Categoria) private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Marca) private readonly marcasRepository: Repository<Marca>,
    @InjectRepository(Estante) private readonly estantesRepository: Repository<Estante>,
  ) {}

  async findAll(query: QueryProductosDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const builder = this.repository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.marca', 'marca')
      .leftJoinAndSelect('producto.estante', 'estante')
      .leftJoinAndSelect('estante.sector', 'sector')
      .leftJoinAndSelect('sector.deposito', 'deposito')
      .orderBy('producto.idProducto', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      builder.andWhere(new Brackets((where) => {
        where
          .where('producto.sku ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('producto.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
          .orWhere('producto.descripcion ILIKE :buscar', { buscar: `%${buscar}%` });
      }));
    }

    const [productos, total] = await builder.getManyAndCount();
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
    const producto = await this.repository.findOne({
      where: { idProducto: id },
      relations: { categoria: true, marca: true, estante: { sector: { deposito: true } } },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');
    return this.toResponse(producto);
  }

  private async findReferences(categoriaId: number, marcaId: number, estanteId: number) {
    const [categoria, marca, estante] = await Promise.all([
      this.categoriasRepository.findOneBy({ idCategoria: categoriaId }),
      this.marcasRepository.findOneBy({ idMarca: marcaId }),
      this.estantesRepository.findOne({
        where: { idEstante: estanteId },
        relations: { sector: { deposito: true } },
      }),
    ]);
    if (!categoria) throw new NotFoundException('Categoría no encontrada o inactiva.');
    if (!marca) throw new NotFoundException('Marca no encontrada o inactiva.');
    if (!estante) throw new NotFoundException('Estante no encontrado o inactivo.');
    return { categoria, marca, estante };
  }

  private async generateNextSku(): Promise<string> {
    const result = await this.repository.query<Array<{ nextval: string }>>(
      "SELECT nextval('producto_codigo_seq') AS nextval",
    );
    const seq = result[0]?.nextval ?? 1;
    return `PROD-${String(seq).padStart(5, '0')}`;
  }

  async create(dto: CreateProductoDto) {
    const references = await this.findReferences(dto.categoriaId, dto.marcaId, dto.estanteId);
    const sku = await this.generateNextSku();
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
    } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async update(id: number, dto: UpdateProductoDto) {
    const producto = await this.repository.findOne({
      where: { idProducto: id },
      relations: { categoria: true, marca: true, estante: { sector: { deposito: true } } },
    });
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
    } catch (error) { throwFriendlyDatabaseError(error); }
  }

  async remove(id: number) {
    const producto = await this.repository.findOneBy({ idProducto: id });
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
