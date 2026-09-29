import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { DataSource, Repository } from 'typeorm';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Categoria } from '../entities/categoria.entity';
import { Estante } from '../entities/estante.entity';
import { ErrorImportacionRegistrado, ImportacionProducto } from '../entities/importacion-producto.entity';
import { Marca } from '../entities/marca.entity';
import { Producto } from '../entities/producto.entity';

type FilaCruda = Record<string, string>;
export type EstadoFilaImportacion = 'NUEVO' | 'ACTUALIZAR' | 'SIN_CAMBIOS' | 'ERROR';

export interface CambioImportacionProducto {
  campo: string;
  actual: string | number | null;
  nuevo: string | number | null;
}

export interface FilaPrevisualizacionProducto {
  fila: number;
  sku: string;
  producto: string;
  estado: EstadoFilaImportacion;
  idProducto?: number;
  cambios: CambioImportacionProducto[];
  errores: string[];
  datos: FilaCruda;
}

export interface ResumenPrevisualizacionProductos {
  nuevos: number;
  actualizar: number;
  sinCambios: number;
  errores: number;
}

export interface PrevisualizacionImportacionProductos {
  token: string;
  nombreArchivo: string;
  totalFilas: number;
  resumen: ResumenPrevisualizacionProductos;
  filas: FilaPrevisualizacionProducto[];
}

export interface ResultadoImportacionProductos {
  idImportacion: number;
  totalProcesados: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  errores: number;
  detalleErrores: ErrorImportacionRegistrado[];
}

interface FilaAnalizada extends FilaPrevisualizacionProducto {
  nuevo?: Partial<Producto>;
  actualizacion?: Partial<Producto>;
}

interface ResultadoAnalisis {
  vista: PrevisualizacionImportacionProductos;
  filas: FilaAnalizada[];
}

interface NumeroLeido {
  presente: boolean;
  valor: number | null;
}

const COLUMNAS_REQUERIDAS = [
  'sku', 'nombre', 'descripcion', 'precio_costo', 'precio_venta', 'stock_inicial',
  'stock_minimo', 'punto_pedido', 'categoria', 'marca', 'deposito', 'sector', 'estante',
];

@Injectable()
export class ImportacionProductosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Producto) private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Categoria) private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Estante) private readonly estantesRepository: Repository<Estante>,
    @InjectRepository(ImportacionProducto) private readonly importacionesRepository: Repository<ImportacionProducto>,
  ) {}

  async previsualizar(file: Express.Multer.File): Promise<PrevisualizacionImportacionProductos> {
    return (await this.analizar(file)).vista;
  }

  async confirmar(file: Express.Multer.File, token: string, usuario: UsuarioAutenticado): Promise<ResultadoImportacionProductos> {
    if (this.tokenArchivo(file) !== token) {
      throw new BadRequestException('El archivo no coincide con la previsualización. Vuelva a analizarlo antes de confirmar.');
    }
    const analisis = await this.analizar(file);
    const nuevas = analisis.filas.filter((fila) => fila.estado === 'NUEVO' && fila.nuevo);
    const actualizaciones = analisis.filas.filter((fila) => fila.estado === 'ACTUALIZAR' && fila.actualizacion);
    const detalleErrores: ErrorImportacionRegistrado[] = analisis.filas
      .filter((fila) => fila.estado === 'ERROR')
      .map((fila) => ({ fila: fila.fila, sku: fila.sku, producto: fila.producto, errores: fila.errores }));

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      if (nuevas.length) {
        await manager.save(Producto, nuevas.map((fila) => manager.create(Producto, fila.nuevo)));
        await manager.query(`
          SELECT setval(
            'producto_codigo_seq',
            GREATEST(
              (SELECT last_value FROM producto_codigo_seq),
              COALESCE((
                SELECT MAX(substring("sku" from '^PROD-([0-9]+)$')::bigint)
                FROM "productos" WHERE "sku" ~ '^PROD-[0-9]+$'
              ), 1)
            ),
            true
          )
        `);
      }
      for (const fila of actualizaciones) {
        await manager.update(Producto, { idProducto: fila.idProducto }, fila.actualizacion ?? {});
      }
      const historial = manager.create(ImportacionProducto, {
        nombreArchivo: file.originalname.slice(0, 255),
        usuarioNombre: usuario.nombre,
        usuario: { idUsuario: usuario.idUsuario } as Usuario,
        totalProcesados: analisis.vista.totalFilas,
        creados: nuevas.length,
        actualizados: actualizaciones.length,
        sinCambios: analisis.vista.resumen.sinCambios,
        errores: detalleErrores.length,
        detalleErrores,
      });
      const guardado = await manager.save(ImportacionProducto, historial);
      return {
        idImportacion: guardado.idImportacion,
        totalProcesados: analisis.vista.totalFilas,
        creados: nuevas.length,
        actualizados: actualizaciones.length,
        sinCambios: analisis.vista.resumen.sinCambios,
        errores: detalleErrores.length,
        detalleErrores,
      };
    });
  }

  listarHistorial(): Promise<ImportacionProducto[]> {
    return this.importacionesRepository.find({ order: { fechaHora: 'DESC' }, take: 50 });
  }

  async generarPlantilla(): Promise<Buffer> {
    const [categorias, estantes] = await Promise.all([
      this.categoriasRepository.find({ relations: { marcas: true }, order: { nombre: 'ASC' } }),
      this.estantesRepository.find({ relations: { sector: { deposito: true } }, order: { codigo: 'ASC' } }),
    ]);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Repuestos';
    workbook.title = 'Plantilla estándar de importación de productos';
    workbook.subject = 'Carga masiva de inventario';

    const instrucciones = workbook.addWorksheet('Instrucciones');
    instrucciones.columns = [{ width: 25 }, { width: 78 }];
    instrucciones.addRows([
      ['PLANTILLA', 'Importación de productos - versión 2.0'],
      ['Uso', 'Complete una fila por producto en la hoja Productos. No cambie los encabezados.'],
      ['Identificador', 'SKU es obligatorio, único y no se modifica. Si existe, se propondrá actualizar el mismo producto; si no existe, se creará uno nuevo.'],
      ['Previsualización', 'La carga primero clasifica las filas. La base de datos solo cambia después de confirmar la importación.'],
      ['Campos vacíos', 'En productos existentes, un campo vacío conserva el valor actual. En productos nuevos se validan los mismos campos obligatorios que en la carga manual.'],
      ['Formatos', 'Precios: números con hasta 2 decimales. Stock, mínimo y punto de pedido: enteros mayores o iguales a 0.'],
      ['Regla de stock', 'punto_pedido debe ser mayor o igual a stock_minimo.'],
      ['Clasificación', 'Categoría y marca deben existir y estar asociadas. Consulte la hoja Referencias.'],
      ['Ubicación', 'La combinación depósito, sector y estante debe existir. Consulte la hoja Referencias.'],
      ['Límite', 'Máximo 2000 productos y 5 MB por archivo. Formatos admitidos: XLSX y CSV.'],
    ]);
    instrucciones.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
    instrucciones.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    instrucciones.getColumn(1).font = { bold: true };
    instrucciones.eachRow((row) => { row.alignment = { vertical: 'top', wrapText: true }; });

    const hoja = workbook.addWorksheet('Productos');
    hoja.columns = [
      { header: 'sku', key: 'sku', width: 22 },
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
    hoja.autoFilter = 'A1:M1';
    hoja.getColumn('precioCosto').numFmt = '#,##0.00';
    hoja.getColumn('precioVenta').numFmt = '#,##0.00';
    ['stock', 'minimo', 'pedido'].forEach((columna) => { hoja.getColumn(columna).numFmt = '0'; });

    const referencias = workbook.addWorksheet('Referencias');
    referencias.columns = [
      { header: 'categorias', key: 'categoria', width: 28 },
      { header: 'marcas', key: 'marca', width: 28 },
      { header: 'depositos', key: 'deposito', width: 28 },
      { header: 'sectores', key: 'sector', width: 24 },
      { header: 'estantes', key: 'estante', width: 20 },
      { header: 'categoria_marca_habilitada', key: 'categoriaMarca', width: 48 },
      { header: 'ubicacion_valida', key: 'ubicacion', width: 64 },
    ];
    const nombresCategorias = categorias.map((categoria) => categoria.nombre);
    const nombresMarcas = [...new Set(categorias.flatMap((categoria) => categoria.marcas.map((marca) => marca.nombre)))].sort();
    const nombresDepositos = [...new Set(estantes.map((estante) => estante.sector.deposito.nombre))].sort();
    const nombresSectores = [...new Set(estantes.map((estante) => estante.sector.nombre))].sort();
    const codigosEstantes = [...new Set(estantes.map((estante) => estante.codigo))].sort();
    const asociaciones = categorias.flatMap((categoria) => categoria.marcas.map((marca) => `${categoria.nombre} → ${marca.nombre}`));
    const ubicaciones = estantes.map((estante) => `${estante.sector.deposito.nombre} → ${estante.sector.nombre} → ${estante.codigo}`);
    const maxReferencias = Math.max(nombresCategorias.length, nombresMarcas.length, nombresDepositos.length,
      nombresSectores.length, codigosEstantes.length, asociaciones.length, ubicaciones.length, 1);
    for (let index = 0; index < maxReferencias; index += 1) {
      referencias.addRow({
        categoria: nombresCategorias[index] ?? '', marca: nombresMarcas[index] ?? '',
        deposito: nombresDepositos[index] ?? '', sector: nombresSectores[index] ?? '',
        estante: codigosEstantes[index] ?? '', categoriaMarca: asociaciones[index] ?? '', ubicacion: ubicaciones[index] ?? '',
      });
    }
    referencias.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    referencias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    referencias.views = [{ state: 'frozen', ySplit: 1 }];
    referencias.autoFilter = 'A1:G1';

    this.agregarLista(hoja, 'I', 'A', nombresCategorias.length);
    this.agregarLista(hoja, 'J', 'B', nombresMarcas.length);
    this.agregarLista(hoja, 'K', 'C', nombresDepositos.length);
    this.agregarLista(hoja, 'L', 'D', nombresSectores.length);
    this.agregarLista(hoja, 'M', 'E', codigosEstantes.length);
    this.agregarValidacion(hoja, 'D', { type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true, showErrorMessage: true, error: 'Ingrese un costo mayor o igual a 0.' });
    this.agregarValidacion(hoja, 'E', { type: 'decimal', operator: 'greaterThan', formulae: [0], allowBlank: true, showErrorMessage: true, error: 'Ingrese un precio mayor a 0.' });
    ['F', 'G', 'H'].forEach((columna) => this.agregarValidacion(hoja, columna, {
      type: 'whole', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true,
      showErrorMessage: true, error: 'Ingrese un número entero mayor o igual a 0.',
    }));

    const ejemplo = workbook.addWorksheet('Ejemplo');
    ejemplo.columns = hoja.columns.map((columna) => ({ header: columna.header, key: columna.key, width: columna.width }));
    const categoriaEjemplo = categorias.find((categoria) => categoria.marcas.length > 0);
    const marcaEjemplo = categoriaEjemplo?.marcas[0];
    const estanteEjemplo = estantes[0];
    ejemplo.addRow({
      sku: 'REP-EJEMPLO-001', nombre: 'Filtro de aceite de ejemplo',
      descripcion: 'Esta fila es demostrativa y no se importa.', precioCosto: 6500, precioVenta: 9900,
      stock: 10, minimo: 3, pedido: 12, categoria: categoriaEjemplo?.nombre ?? 'Categoría existente',
      marca: marcaEjemplo?.nombre ?? 'Marca habilitada', deposito: estanteEjemplo?.sector.deposito.nombre ?? 'Depósito existente',
      sector: estanteEjemplo?.sector.nombre ?? 'Sector existente', estante: estanteEjemplo?.codigo ?? 'Estante existente',
    });
    ejemplo.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ejemplo.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async analizar(file: Express.Multer.File): Promise<ResultadoAnalisis> {
    const { filas, encabezados } = this.extraerFilas(await this.leerArchivo(file));
    const faltantes = COLUMNAS_REQUERIDAS.filter((columna) => !encabezados.includes(columna));
    if (faltantes.length) throw new BadRequestException(`Faltan columnas obligatorias: ${faltantes.join(', ')}.`);
    if (!filas.length) throw new BadRequestException('El archivo no contiene productos para importar.');
    if (filas.length > 2000) throw new BadRequestException('Solo se permiten hasta 2000 productos por importación.');

    const [categorias, estantes] = await Promise.all([
      this.categoriasRepository.find({ relations: { marcas: true } }),
      this.estantesRepository.find({ relations: { sector: { deposito: true } } }),
    ]);
    const skus = [...new Set(filas.map(({ datos }) => this.normalizarSku(datos.sku)).filter(Boolean))];
    const existentes = skus.length
      ? await this.productosRepository.createQueryBuilder('producto').withDeleted()
        .leftJoinAndSelect('producto.categoria', 'categoria').leftJoinAndSelect('producto.marca', 'marca')
        .leftJoinAndSelect('producto.estante', 'estante').leftJoinAndSelect('estante.sector', 'sector')
        .leftJoinAndSelect('sector.deposito', 'deposito')
        .where('UPPER(TRIM(producto.sku)) IN (:...skus)', { skus }).getMany()
      : [];
    const porSku = new Map(existentes.map((producto) => [this.normalizarSku(producto.sku), producto]));
    const cantidades = filas.reduce((mapa, fila) => {
      const sku = this.normalizarSku(fila.datos.sku);
      if (sku) mapa.set(sku, (mapa.get(sku) ?? 0) + 1);
      return mapa;
    }, new Map<string, number>());
    const analizadas = filas.map(({ numero, datos }) => this.analizarFila(
      numero, datos, porSku.get(this.normalizarSku(datos.sku)), cantidades, categorias, estantes,
    ));
    const resumen: ResumenPrevisualizacionProductos = {
      nuevos: analizadas.filter((fila) => fila.estado === 'NUEVO').length,
      actualizar: analizadas.filter((fila) => fila.estado === 'ACTUALIZAR').length,
      sinCambios: analizadas.filter((fila) => fila.estado === 'SIN_CAMBIOS').length,
      errores: analizadas.filter((fila) => fila.estado === 'ERROR').length,
    };
    return {
      vista: {
        token: this.tokenArchivo(file), nombreArchivo: file.originalname, totalFilas: filas.length, resumen,
        filas: analizadas.map((fila) => ({
          fila: fila.fila,
          sku: fila.sku,
          producto: fila.producto,
          estado: fila.estado,
          idProducto: fila.idProducto,
          cambios: fila.cambios,
          errores: fila.errores,
          datos: fila.datos,
        })),
      },
      filas: analizadas,
    };
  }

  private analizarFila(
    fila: number, datos: FilaCruda, existente: Producto | undefined, cantidades: Map<string, number>,
    categorias: Categoria[], estantes: Estante[],
  ): FilaAnalizada {
    const sku = this.normalizarSku(datos.sku);
    const nombre = datos.nombre?.trim() ?? '';
    const errores: string[] = [];
    if (!sku) errores.push('El SKU es obligatorio.');
    if (sku.length > 50) errores.push('El SKU supera los 50 caracteres.');
    if (sku && (cantidades.get(sku) ?? 0) > 1) errores.push('El SKU está duplicado dentro del archivo.');
    if (existente?.fechaBaja) errores.push('El SKU pertenece a un producto dado de baja.');
    if (errores.length) return this.filaError(fila, sku, nombre, errores, datos, existente?.idProducto);
    return existente
      ? this.analizarExistente(fila, datos, existente, categorias, estantes)
      : this.analizarNuevo(fila, datos, sku, categorias, estantes);
  }

  private analizarNuevo(fila: number, datos: FilaCruda, sku: string, categorias: Categoria[], estantes: Estante[]): FilaAnalizada {
    const errores: string[] = [];
    const nombre = datos.nombre?.trim() ?? '';
    if (!nombre) errores.push('El nombre es obligatorio para un producto nuevo.');
    if (nombre.length > 120) errores.push('El nombre supera los 120 caracteres.');
    const descripcion = datos.descripcion?.trim() || null;
    if ((descripcion?.length ?? 0) > 2000) errores.push('La descripción supera los 2000 caracteres.');
    const costo = this.decimal(datos.precio_costo);
    const precio = this.decimal(datos.precio_venta);
    const stock = this.entero(datos.stock_inicial);
    const minimo = this.entero(datos.stock_minimo);
    const pedido = this.entero(datos.punto_pedido);
    if (costo.presente && (costo.valor === null || costo.valor < 0)) errores.push('precio_costo debe ser un número mayor o igual a 0.');
    if (!precio.presente || precio.valor === null || precio.valor <= 0) errores.push('precio_venta debe ser un número mayor a 0.');
    if (!stock.presente || stock.valor === null || stock.valor < 0) errores.push('stock_inicial debe ser un entero mayor o igual a 0.');
    if (minimo.presente && (minimo.valor === null || minimo.valor < 0)) errores.push('stock_minimo debe ser un entero mayor o igual a 0.');
    if (pedido.presente && (pedido.valor === null || pedido.valor < 0)) errores.push('punto_pedido debe ser un entero mayor o igual a 0.');
    const stockMinimo = minimo.presente ? minimo.valor : 0;
    const puntoPedido = pedido.presente ? pedido.valor : 0;
    if (stockMinimo !== null && puntoPedido !== null && puntoPedido < stockMinimo) errores.push('punto_pedido debe ser mayor o igual a stock_minimo.');
    const categoria = this.buscarCategoria(categorias, datos.categoria);
    if (!categoria) errores.push(`Categoría inexistente o inactiva: ${datos.categoria || '(vacía)'}.`);
    const marca = this.buscarMarca(categoria, datos.marca);
    if (categoria && !marca) errores.push(`La marca ${datos.marca || '(vacía)'} no está habilitada para ${categoria.nombre}.`);
    const estante = this.buscarEstante(estantes, datos.deposito, datos.sector, datos.estante);
    if (!estante) errores.push('No existe la combinación depósito/sector/estante indicada.');
    if (errores.length || precio.valor === null || stock.valor === null || stockMinimo === null
      || puntoPedido === null || !categoria || !marca || !estante) return this.filaError(fila, sku, nombre, errores, datos);
    return {
      fila, sku, producto: nombre, estado: 'NUEVO', cambios: [], errores: [], datos: { ...datos },
      nuevo: {
        sku, nombre, descripcion, precioCosto: costo.presente ? costo.valor : null,
        precioUnitario: precio.valor, stock: stock.valor, stockMinimo, puntoPedido,
        categoria, marca, estante, imagenUrl: null,
      },
    };
  }

  private analizarExistente(
    fila: number, datos: FilaCruda, producto: Producto, categorias: Categoria[], estantes: Estante[],
  ): FilaAnalizada {
    const errores: string[] = [];
    const cambios: CambioImportacionProducto[] = [];
    const actualizacion: Partial<Producto> = {};
    const nombre = datos.nombre?.trim();
    if (nombre && nombre.length > 120) errores.push('El nombre supera los 120 caracteres.');
    else if (nombre) this.agregarCambio(cambios, actualizacion, 'nombre', producto.nombre, nombre);
    const descripcion = datos.descripcion?.trim();
    if (descripcion && descripcion.length > 2000) errores.push('La descripción supera los 2000 caracteres.');
    else if (descripcion) this.agregarCambio(cambios, actualizacion, 'descripcion', producto.descripcion, descripcion);
    const costo = this.decimal(datos.precio_costo);
    const precio = this.decimal(datos.precio_venta);
    const stock = this.entero(datos.stock_inicial);
    const minimo = this.entero(datos.stock_minimo);
    const pedido = this.entero(datos.punto_pedido);
    if (costo.presente && (costo.valor === null || costo.valor < 0)) errores.push('precio_costo debe ser un número mayor o igual a 0.');
    else if (costo.presente) this.agregarCambio(cambios, actualizacion, 'precioCosto', producto.precioCosto, costo.valor);
    if (precio.presente && (precio.valor === null || precio.valor <= 0)) errores.push('precio_venta debe ser un número mayor a 0.');
    else if (precio.presente) this.agregarCambio(cambios, actualizacion, 'precioUnitario', producto.precioUnitario, precio.valor);
    if (stock.presente && (stock.valor === null || stock.valor < 0)) errores.push('stock_inicial debe ser un entero mayor o igual a 0.');
    else if (stock.presente) this.agregarCambio(cambios, actualizacion, 'stock', producto.stock, stock.valor);
    if (minimo.presente && (minimo.valor === null || minimo.valor < 0)) errores.push('stock_minimo debe ser un entero mayor o igual a 0.');
    else if (minimo.presente) this.agregarCambio(cambios, actualizacion, 'stockMinimo', producto.stockMinimo, minimo.valor);
    if (pedido.presente && (pedido.valor === null || pedido.valor < 0)) errores.push('punto_pedido debe ser un entero mayor o igual a 0.');
    else if (pedido.presente) this.agregarCambio(cambios, actualizacion, 'puntoPedido', producto.puntoPedido, pedido.valor);
    const stockMinimoFinal = minimo.presente && minimo.valor !== null ? minimo.valor : producto.stockMinimo;
    const puntoPedidoFinal = pedido.presente && pedido.valor !== null ? pedido.valor : producto.puntoPedido;
    if (puntoPedidoFinal < stockMinimoFinal) errores.push('punto_pedido debe ser mayor o igual a stock_minimo.');

    const categoriaActual = categorias.find((item) => item.idCategoria === producto.categoria.idCategoria);
    const categoria = datos.categoria?.trim() ? this.buscarCategoria(categorias, datos.categoria) : categoriaActual;
    if (!categoria) errores.push(`Categoría inexistente o inactiva: ${datos.categoria}.`);
    const marca = datos.marca?.trim()
      ? this.buscarMarca(categoria, datos.marca)
      : categoria?.marcas.find((item) => item.idMarca === producto.marca.idMarca);
    if (categoria && !marca) errores.push(`La marca ${datos.marca || producto.marca.nombre} no está habilitada para ${categoria.nombre}.`);
    if (categoria) this.agregarCambioRelacion(cambios, actualizacion, 'categoria', producto.categoria, categoria, 'idCategoria', 'nombre');
    if (marca) this.agregarCambioRelacion(cambios, actualizacion, 'marca', producto.marca, marca, 'idMarca', 'nombre');

    if (datos.deposito?.trim() || datos.sector?.trim() || datos.estante?.trim()) {
      const deposito = datos.deposito?.trim() || producto.estante.sector.deposito.nombre;
      const sector = datos.sector?.trim() || producto.estante.sector.nombre;
      const codigo = datos.estante?.trim() || producto.estante.codigo;
      const estante = this.buscarEstante(estantes, deposito, sector, codigo);
      if (!estante) errores.push('No existe la combinación depósito/sector/estante indicada.');
      else this.agregarCambioRelacion(cambios, actualizacion, 'estante', producto.estante, estante, 'idEstante', 'codigo');
    }
    if (errores.length) return this.filaError(fila, producto.sku, nombre || producto.nombre, errores, datos, producto.idProducto);
    return {
      fila, sku: producto.sku, producto: nombre || producto.nombre, idProducto: producto.idProducto,
      estado: cambios.length ? 'ACTUALIZAR' : 'SIN_CAMBIOS', cambios, errores: [], datos: { ...datos },
      actualizacion: cambios.length ? actualizacion : undefined,
    };
  }

  private agregarCambio(
    cambios: CambioImportacionProducto[], actualizacion: Partial<Producto>, campo: keyof Producto,
    actual: string | number | null, nuevo: string | number | null,
  ): void {
    if (actual === nuevo || (typeof actual === 'number' && typeof nuevo === 'number' && Number(actual) === Number(nuevo))) return;
    cambios.push({ campo, actual, nuevo });
    Object.assign(actualizacion, { [campo]: nuevo });
  }

  private agregarCambioRelacion<T extends Categoria | Marca | Estante>(
    cambios: CambioImportacionProducto[], actualizacion: Partial<Producto>, campo: 'categoria' | 'marca' | 'estante',
    actual: T, nuevo: T, id: keyof T, etiqueta: keyof T,
  ): void {
    if (actual[id] === nuevo[id]) return;
    cambios.push({ campo, actual: String(actual[etiqueta]), nuevo: String(nuevo[etiqueta]) });
    Object.assign(actualizacion, { [campo]: nuevo });
  }

  private filaError(
    fila: number, sku: string, producto: string, errores: string[], datos: FilaCruda, idProducto?: number,
  ): FilaAnalizada {
    return {
      fila, sku: sku || '(sin SKU)', producto: producto || '(sin nombre)', idProducto,
      estado: 'ERROR', cambios: [], errores, datos: { ...datos },
    };
  }

  private buscarCategoria(categorias: Categoria[], valor?: string): Categoria | undefined {
    return categorias.find((item) => this.normalizar(item.nombre) === this.normalizar(valor));
  }

  private buscarMarca(categoria: Categoria | undefined, valor?: string): Marca | undefined {
    return categoria?.marcas.find((item) => this.normalizar(item.nombre) === this.normalizar(valor));
  }

  private buscarEstante(estantes: Estante[], deposito?: string, sector?: string, codigo?: string): Estante | undefined {
    return estantes.find((item) => this.normalizar(item.codigo) === this.normalizar(codigo)
      && this.normalizar(item.sector.nombre) === this.normalizar(sector)
      && this.normalizar(item.sector.deposito.nombre) === this.normalizar(deposito));
  }

  private agregarLista(hoja: ExcelJS.Worksheet, destino: string, referencia: string, cantidad: number): void {
    if (!cantidad) return;
    this.agregarValidacion(hoja, destino, {
      type: 'list', allowBlank: true,
      formulae: [`'Referencias'!$${referencia}$2:$${referencia}$${cantidad + 1}`],
      showErrorMessage: true, error: 'Seleccione un valor disponible en la hoja Referencias.',
    });
  }

  private agregarValidacion(hoja: ExcelJS.Worksheet, columna: string, validacion: ExcelJS.DataValidation): void {
    for (let fila = 2; fila <= 2001; fila += 1) hoja.getCell(`${columna}${fila}`).dataValidation = validacion;
  }

  private async leerArchivo(file: Express.Multer.File): Promise<ExcelJS.Worksheet> {
    const workbook = new ExcelJS.Workbook();
    const extension = file.originalname.toLowerCase().split('.').pop();
    try {
      if (extension === 'csv') return await workbook.csv.read(Readable.from(file.buffer));
      await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
      const hoja = workbook.getWorksheet('Productos') ?? workbook.worksheets[0];
      if (!hoja) throw new Error('Sin hojas');
      return hoja;
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Verifique que sea un .xlsx o .csv válido.');
    }
  }

  private extraerFilas(hoja: ExcelJS.Worksheet): { encabezados: string[]; filas: Array<{ numero: number; datos: FilaCruda }> } {
    const headers: string[] = [];
    hoja.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => { headers[column] = this.normalizarEncabezado(cell.text); });
    const filas: Array<{ numero: number; datos: FilaCruda }> = [];
    hoja.eachRow((row, numero) => {
      if (numero === 1) return;
      const datos: FilaCruda = {};
      headers.forEach((header, column) => { if (header) datos[header] = row.getCell(column).text.trim(); });
      if (Object.values(datos).some((valor) => valor !== '')) filas.push({ numero, datos });
    });
    return { encabezados: headers.filter(Boolean), filas };
  }

  private normalizarEncabezado(valor: string): string {
    const normalizado = this.normalizar(valor).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return ({ codigo: 'sku', codigo_producto: 'sku', precio_unitario: 'precio_venta', stock: 'stock_inicial', costo: 'precio_costo' } as Record<string, string>)[normalizado] ?? normalizado;
  }

  private normalizarSku(valor?: string): string {
    return (valor ?? '').trim().toUpperCase();
  }

  private normalizar(valor?: string): string {
    return (valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private decimal(valor?: string): NumeroLeido {
    const original = (valor ?? '').trim();
    if (!original) return { presente: false, valor: null };
    const limpio = original.replace(/\s/g, '').replace(',', '.');
    if (!/^-?\d+(\.\d{1,2})?$/.test(limpio)) return { presente: true, valor: null };
    const numero = Number(limpio);
    return { presente: true, valor: Number.isFinite(numero) ? numero : null };
  }

  private entero(valor?: string): NumeroLeido {
    const limpio = (valor ?? '').trim();
    if (!limpio) return { presente: false, valor: null };
    if (!/^-?\d+$/.test(limpio)) return { presente: true, valor: null };
    const numero = Number(limpio);
    return { presente: true, valor: Number.isSafeInteger(numero) ? numero : null };
  }

  private tokenArchivo(file: Express.Multer.File): string {
    return createHash('sha256').update(file.buffer).digest('hex');
  }
}
