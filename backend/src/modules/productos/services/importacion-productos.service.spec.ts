import * as ExcelJS from 'exceljs';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';
import { Estante } from '../entities/estante.entity';
import { ImportacionProducto } from '../entities/importacion-producto.entity';
import { Marca } from '../entities/marca.entity';
import { Producto } from '../entities/producto.entity';
import { ImportacionProductosService } from './importacion-productos.service';

describe('ImportacionProductosService', () => {
  const marca = { idMarca: 1, nombre: 'Bosch' } as Marca;
  const categoria = { idCategoria: 1, nombre: 'Filtros', marcas: [marca] } as Categoria;
  const estante = {
    idEstante: 1,
    codigo: 'A-01',
    sector: { idSector: 1, nombre: 'A', deposito: { idDeposito: 1, nombre: 'Depósito Principal' } },
  } as Estante;

  let queryBuilder: jest.Mocked<Pick<SelectQueryBuilder<Producto>, 'withDeleted' | 'leftJoinAndSelect' | 'where' | 'getMany'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let service: ImportacionProductosService;

  beforeEach(() => {
    dataSource = { transaction: jest.fn() };
    queryBuilder = {
      withDeleted: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const productosRepository = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    const categoriasRepository = { find: jest.fn().mockResolvedValue([categoria]) };
    const estantesRepository = { find: jest.fn().mockResolvedValue([estante]) };
    const importacionesRepository = { find: jest.fn().mockResolvedValue([]) };
    service = new ImportacionProductosService(
      dataSource as unknown as DataSource,
      productosRepository as unknown as Repository<Producto>,
      categoriasRepository as unknown as Repository<Categoria>,
      estantesRepository as unknown as Repository<Estante>,
      importacionesRepository as unknown as Repository<ImportacionProducto>,
    );
  });

  it('genera una plantilla estándar con SKU, instrucciones, referencias y validaciones', async () => {
    const archivo = await service.generarPlantilla();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(archivo as unknown as ExcelJS.Buffer);

    expect(workbook.worksheets.map((hoja) => hoja.name)).toEqual(['Instrucciones', 'Productos', 'Referencias', 'Ejemplo']);
    const productos = workbook.getWorksheet('Productos');
    const referencias = workbook.getWorksheet('Referencias');
    expect(productos?.getCell('A1').text).toBe('sku');
    expect(productos?.rowCount).toBe(2001);
    expect(productos?.getCell('I2').dataValidation.type).toBe('list');
    expect(referencias?.getCell('A2').text).toBe('Filtros');
    expect(referencias?.getCell('G2').text).toContain('Depósito Principal → A → A-01');
  });

  it('previsualiza una fila inválida sin modificar la base de datos', async () => {
    const csv = [
      'sku,nombre,descripcion,precio_costo,precio_venta,stock_inicial,stock_minimo,punto_pedido,categoria,marca,deposito,sector,estante',
      'REP-001,Filtro premium,Prueba,1200,PRECIO_MAL,8,2,9,Filtros,Bosch,Depósito Principal,A,A-01',
    ].join('\n');

    const resultado = await service.previsualizar({
      originalname: 'productos.csv', buffer: Buffer.from(csv),
    } as Express.Multer.File);

    expect(resultado).toMatchObject({ totalFilas: 1, resumen: { nuevos: 0, actualizar: 0, sinCambios: 0, errores: 1 } });
    expect(resultado.filas[0]).toMatchObject({
      fila: 2, sku: 'REP-001', producto: 'Filtro premium', estado: 'ERROR',
      datos: { precio_venta: 'PRECIO_MAL', categoria: 'Filtros', estante: 'A-01' },
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('clasifica por SKU y solo propone cambios informados para un producto existente', async () => {
    queryBuilder.getMany.mockResolvedValue([{
      idProducto: 22,
      sku: 'REP-001',
      nombre: 'Filtro actual',
      descripcion: 'Descripción conservada',
      precioCosto: 1000,
      precioUnitario: 2000,
      stock: 5,
      stockMinimo: 1,
      puntoPedido: 2,
      categoria,
      marca,
      estante,
      fechaBaja: null,
    } as Producto]);
    const csv = [
      'sku,nombre,descripcion,precio_costo,precio_venta,stock_inicial,stock_minimo,punto_pedido,categoria,marca,deposito,sector,estante',
      'rep-001,,,,2500,,,,,,,,',
    ].join('\n');

    const resultado = await service.previsualizar({
      originalname: 'productos.csv', buffer: Buffer.from(csv),
    } as Express.Multer.File);

    expect(resultado.resumen).toEqual({ nuevos: 0, actualizar: 1, sinCambios: 0, errores: 0 });
    expect(resultado.filas[0]).toMatchObject({ idProducto: 22, sku: 'REP-001', estado: 'ACTUALIZAR' });
    expect(resultado.filas[0].cambios).toEqual([{ campo: 'precioUnitario', actual: 2000, nuevo: 2500 }]);
  });
});
