import * as ExcelJS from 'exceljs';
import { DataSource, Repository } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';
import { Estante } from '../entities/estante.entity';
import { Marca } from '../entities/marca.entity';
import { Producto } from '../entities/producto.entity';
import { ImportacionProductosService } from './importacion-productos.service';

describe('ImportacionProductosService', () => {
  const marca = { idMarca: 1, nombre: 'Bosch' } as Marca;
  const categoria = { idCategoria: 1, nombre: 'Filtros', marcas: [marca] } as Categoria;
  const estante = {
    idEstante: 1,
    codigo: 'A-01',
    sector: {
      idSector: 1,
      nombre: 'A',
      deposito: { idDeposito: 1, nombre: 'Depósito Principal' },
    },
  } as Estante;

  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let productosRepository: jest.Mocked<Pick<Repository<Producto>, 'createQueryBuilder'>>;
  let categoriasRepository: jest.Mocked<Pick<Repository<Categoria>, 'find'>>;
  let estantesRepository: jest.Mocked<Pick<Repository<Estante>, 'find'>>;
  let service: ImportacionProductosService;

  beforeEach(() => {
    dataSource = { transaction: jest.fn() };
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    productosRepository = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    categoriasRepository = { find: jest.fn().mockResolvedValue([categoria]) };
    estantesRepository = { find: jest.fn().mockResolvedValue([estante]) };
    service = new ImportacionProductosService(
      dataSource as unknown as DataSource,
      productosRepository as unknown as Repository<Producto>,
      categoriasRepository as unknown as Repository<Categoria>,
      estantesRepository as unknown as Repository<Estante>,
    );
  });

  it('genera una plantilla estándar con instrucciones, referencias y validaciones', async () => {
    const archivo = await service.generarPlantilla();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(archivo as unknown as ExcelJS.Buffer);

    expect(workbook.worksheets.map((hoja) => hoja.name)).toEqual([
      'Instrucciones',
      'Productos',
      'Referencias',
      'Ejemplo',
    ]);
    const productos = workbook.getWorksheet('Productos');
    const referencias = workbook.getWorksheet('Referencias');
    expect(productos?.rowCount).toBe(2001);
    expect(productos?.getCell('H2').dataValidation.type).toBe('list');
    expect(referencias?.getCell('A2').text).toBe('Filtros');
    expect(referencias?.getCell('G2').text).toContain('Depósito Principal → A → A-01');
  });

  it('devuelve los datos originales de cada fila inválida para poder corregirla', async () => {
    const csv = [
      'nombre,descripcion,precio_costo,precio_venta,stock_inicial,stock_minimo,punto_pedido,categoria,marca,deposito,sector,estante',
      'Filtro premium,Prueba,1200,PRECIO_MAL,8,2,9,Filtros,Bosch,Depósito Principal,A,A-01',
    ].join('\n');

    const resultado = await service.importar({
      originalname: 'productos.csv',
      buffer: Buffer.from(csv),
    } as Express.Multer.File);

    expect(resultado).toMatchObject({ totalFilas: 1, importados: 0, conErrores: 1 });
    expect(resultado.errores[0]).toMatchObject({
      fila: 2,
      producto: 'Filtro premium',
      datos: { precio_venta: 'PRECIO_MAL', categoria: 'Filtros', estante: 'A-01' },
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
