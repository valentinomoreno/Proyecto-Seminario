import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { DataSource, Repository } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';
import { Estante } from '../entities/estante.entity';
import { Producto } from '../entities/producto.entity';

type FilaCruda = Record<string, string>;

interface FilaValida {
  fila: number;
  nombre: string;
  descripcion: string | null;
  precioCosto: number;
  precioUnitario: number;
  stock: number;
  stockMinimo: number;
  puntoPedido: number;
  categoria: Categoria;
  marcaId: number;
  estante: Estante;
  clave: string;
}

export interface ErrorImportacion {
  fila: number;
  producto: string;
  errores: string[];
}

export interface ResultadoImportacion {
  totalFilas: number;
  importados: number;
  conErrores: number;
  errores: ErrorImportacion[];
}

const COLUMNAS_REQUERIDAS = [
  'nombre',
  'precio_costo',
  'precio_venta',
  'stock_inicial',
  'stock_minimo',
  'punto_pedido',
  'categoria',
  'marca',
  'deposito',
  'sector',
  'estante',
];

@Injectable()
export class ImportacionProductosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Producto) private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Categoria) private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Estante) private readonly estantesRepository: Repository<Estante>,
  ) {}

  async importar(file: Express.Multer.File): Promise<ResultadoImportacion> {
    const hoja = await this.leerArchivo(file);
    const { filas, encabezados } = this.extraerFilas(hoja);
    const faltantes = COLUMNAS_REQUERIDAS.filter((columna) => !encabezados.includes(columna));
    if (faltantes.length) {
      throw new BadRequestException(`Faltan columnas obligatorias: ${faltantes.join(', ')}.`);
    }
    if (filas.length === 0) throw new BadRequestException('El archivo no contiene productos para importar.');
    if (filas.length > 2000) throw new BadRequestException('Solo se permiten hasta 2000 productos por importación.');

    const [categorias, estantes] = await Promise.all([
      this.categoriasRepository.find({ relations: { marcas: true } }),
      this.estantesRepository.find({ relations: { sector: { deposito: true } } }),
    ]);

    const nombres = [...new Set(filas.map(({ datos }) => this.normalizar(datos.nombre)).filter(Boolean))];
    const existentes = nombres.length
      ? await this.productosRepository
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.categoria', 'categoria')
        .leftJoinAndSelect('producto.marca', 'marca')
        .where('LOWER(TRIM(producto.nombre)) IN (:...nombres)', { nombres })
        .getMany()
      : [];
    const clavesExistentes = new Set(existentes.map((producto) => this.claveProducto(
      producto.nombre,
      producto.categoria.nombre,
      producto.marca.nombre,
    )));
    const clavesArchivo = new Set<string>();
    const errores: ErrorImportacion[] = [];
    const validas: FilaValida[] = [];

    for (const { numero, datos } of filas) {
      const resultado = this.validarFila(numero, datos, categorias, estantes, clavesExistentes, clavesArchivo);
      if ('errores' in resultado) errores.push(resultado);
      else {
        validas.push(resultado);
        clavesArchivo.add(resultado.clave);
      }
    }

    if (validas.length) {
      await this.dataSource.transaction(async (manager) => {
        const secuencias = await manager.query<Array<{ nextval: string }>>(
          `SELECT nextval('producto_codigo_seq')::text AS nextval FROM generate_series(1, $1)`,
          [validas.length],
        );
        const productos = validas.map((fila, index) => manager.create(Producto, {
          sku: `PROD-${String(secuencias[index].nextval).padStart(5, '0')}`,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          precioCosto: fila.precioCosto,
          precioUnitario: fila.precioUnitario,
          stock: fila.stock,
          stockMinimo: fila.stockMinimo,
          puntoPedido: fila.puntoPedido,
          categoria: fila.categoria,
          marca: { idMarca: fila.marcaId },
          estante: fila.estante,
          imagenUrl: null,
        }));
        await manager.save(Producto, productos);
      });
    }

    return {
      totalFilas: filas.length,
      importados: validas.length,
      conErrores: errores.length,
      errores,
    };
  }

  async generarPlantilla(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const hoja = workbook.addWorksheet('Productos');
    hoja.columns = [
      { header: 'nombre', key: 'nombre', width: 34 },
      { header: 'descripcion', key: 'descripcion', width: 42 },
      { header: 'precio_costo', key: 'precioCosto', width: 16 },
      { header: 'precio_venta', key: 'precioVenta', width: 16 },
      { header: 'stock_inicial', key: 'stock', width: 16 },
      { header: 'stock_minimo', key: 'minimo', width: 16 },
      { header: 'punto_pedido', key: 'pedido', width: 16 },
      { header: 'categoria', key: 'categoria', width: 24 },
      { header: 'marca', key: 'marca', width: 22 },
      { header: 'deposito', key: 'deposito', width: 20 },
      { header: 'sector', key: 'sector', width: 16 },
      { header: 'estante', key: 'estante', width: 16 },
    ];
    const encabezado = hoja.getRow(1);
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1677FF' } };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    hoja.autoFilter = 'A1:L1';
    hoja.addRow({
      nombre: 'Filtro de aceite',
      descripcion: 'Ejemplo: elimine esta fila antes de importar',
      precioCosto: 6500,
      precioVenta: 9900,
      stock: 10,
      minimo: 3,
      pedido: 12,
      categoria: 'Filtros',
      marca: 'Bosch',
      deposito: 'Depósito Principal',
      sector: 'A',
      estante: 'A-01',
    });
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  private async leerArchivo(file: Express.Multer.File): Promise<ExcelJS.Worksheet> {
    const workbook = new ExcelJS.Workbook();
    const extension = file.originalname.toLowerCase().split('.').pop();
    try {
      if (extension === 'csv') {
        return await workbook.csv.read(Readable.from(file.buffer));
      }
      await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
      const hoja = workbook.worksheets[0];
      if (!hoja) throw new Error('Sin hojas');
      return hoja;
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Verifique que sea un .xlsx o .csv válido.');
    }
  }

  private extraerFilas(hoja: ExcelJS.Worksheet): {
    encabezados: string[];
    filas: Array<{ numero: number; datos: FilaCruda }>;
  } {
    const headers: string[] = [];
    hoja.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
      headers[column] = this.normalizarEncabezado(cell.text);
    });
    const filas: Array<{ numero: number; datos: FilaCruda }> = [];
    hoja.eachRow((row, numero) => {
      if (numero === 1) return;
      const datos: FilaCruda = {};
      headers.forEach((header, column) => {
        if (header) datos[header] = row.getCell(column).text.trim();
      });
      if (Object.values(datos).some((valor) => valor !== '')) filas.push({ numero, datos });
    });
    return { encabezados: headers.filter(Boolean), filas };
  }

  private validarFila(
    fila: number,
    datos: FilaCruda,
    categorias: Categoria[],
    estantes: Estante[],
    clavesExistentes: Set<string>,
    clavesArchivo: Set<string>,
  ): FilaValida | ErrorImportacion {
    const errores: string[] = [];
    const nombre = datos.nombre?.trim() ?? '';
    if (!nombre) errores.push('El nombre es obligatorio.');
    if (nombre.length > 120) errores.push('El nombre supera los 120 caracteres.');

    const precioCosto = this.decimal(datos.precio_costo);
    const precioUnitario = this.decimal(datos.precio_venta);
    const stock = this.entero(datos.stock_inicial);
    const stockMinimo = this.entero(datos.stock_minimo);
    const puntoPedido = this.entero(datos.punto_pedido);
    if (precioCosto === null || precioCosto < 0) errores.push('precio_costo debe ser un número mayor o igual a 0.');
    if (precioUnitario === null || precioUnitario <= 0) errores.push('precio_venta debe ser un número mayor a 0.');
    if (stock === null || stock < 0) errores.push('stock_inicial debe ser un entero mayor o igual a 0.');
    if (stockMinimo === null || stockMinimo < 0) errores.push('stock_minimo debe ser un entero mayor o igual a 0.');
    if (puntoPedido === null || puntoPedido < 0) errores.push('punto_pedido debe ser un entero mayor o igual a 0.');
    if (stockMinimo !== null && puntoPedido !== null && puntoPedido < stockMinimo) {
      errores.push('punto_pedido debe ser mayor o igual a stock_minimo.');
    }

    const categoria = categorias.find((item) => this.normalizar(item.nombre) === this.normalizar(datos.categoria));
    if (!categoria) errores.push(`Categoría inexistente o inactiva: ${datos.categoria || '(vacía)'}.`);
    const marca = categoria?.marcas.find((item) => this.normalizar(item.nombre) === this.normalizar(datos.marca));
    if (categoria && !marca) errores.push(`La marca ${datos.marca || '(vacía)'} no está habilitada para ${categoria.nombre}.`);

    const estante = estantes.find((item) =>
      this.normalizar(item.codigo) === this.normalizar(datos.estante)
      && this.normalizar(item.sector.nombre) === this.normalizar(datos.sector)
      && this.normalizar(item.sector.deposito.nombre) === this.normalizar(datos.deposito),
    );
    if (!estante) errores.push('No existe la combinación depósito/sector/estante indicada.');

    const clave = this.claveProducto(nombre, datos.categoria, datos.marca);
    if (clavesExistentes.has(clave)) errores.push('El producto ya existe con el mismo nombre, categoría y marca.');
    if (clavesArchivo.has(clave)) errores.push('El producto está duplicado dentro del archivo.');

    if (errores.length || precioCosto === null || precioUnitario === null || stock === null
      || stockMinimo === null || puntoPedido === null || !categoria || !marca || !estante) {
      return { fila, producto: nombre || '(sin nombre)', errores };
    }
    return {
      fila,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      precioCosto,
      precioUnitario,
      stock,
      stockMinimo,
      puntoPedido,
      categoria,
      marcaId: marca.idMarca,
      estante,
      clave,
    };
  }

  private normalizarEncabezado(valor: string): string {
    const normalizado = this.normalizar(valor).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const aliases: Record<string, string> = {
      precio_unitario: 'precio_venta',
      stock: 'stock_inicial',
      costo: 'precio_costo',
    };
    return aliases[normalizado] ?? normalizado;
  }

  private normalizar(valor: string | undefined): string {
    return (valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private claveProducto(nombre: string, categoria: string, marca: string): string {
    return [nombre, categoria, marca].map((valor) => this.normalizar(valor)).join('|');
  }

  private decimal(valor: string | undefined): number | null {
    const limpio = (valor ?? '').trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : null;
  }

  private entero(valor: string | undefined): number | null {
    const limpio = (valor ?? '').trim();
    if (!/^\d+$/.test(limpio)) return null;
    const numero = Number(limpio);
    return Number.isSafeInteger(numero) ? numero : null;
  }
}
