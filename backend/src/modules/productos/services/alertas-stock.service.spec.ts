import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Producto } from '../entities/producto.entity';
import { IProductosRepository } from '../repositories/interfaces/productos-repository.interface';
import { AlertasStockService } from './alertas-stock.service';

describe('AlertasStockService', () => {
  let repository: jest.Mocked<IProductosRepository>;
  let service: AlertasStockService;

  const producto = {
    idProducto: 1,
    sku: 'PROD-00001',
    nombre: 'Filtro de aceite',
    stock: 2,
    stockMinimo: 3,
    precioCosto: 5000,
    categoria: { nombre: 'Filtros' },
    marca: { nombre: 'Bosch' },
  } as Producto;

  beforeEach(() => {
    repository = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      findBajoMinimo: jest.fn().mockResolvedValue([producto]),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      generateNextSku: jest.fn(),
      countByCategoria: jest.fn(),
      countByMarca: jest.fn(),
      countByEstante: jest.fn(),
    };
    service = new AlertasStockService(repository);
  });

  it('detecta stock bajo el mínimo y sugiere reponer hasta el mínimo', async () => {
    const resultado = await service.evaluar();
    expect(resultado.total).toBe(1);
    expect(resultado.productos[0]).toMatchObject({ stockActual: 2, cantidadSugerida: 1 });
  });

  it('genera un Excel con cantidades revisadas', async () => {
    const archivo = await service.exportar({ items: [{ idProducto: 1, cantidad: 12 }] });
    expect(Buffer.isBuffer(archivo)).toBe(true);
    expect(archivo.length).toBeGreaterThan(1000);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(archivo as unknown as ExcelJS.Buffer);
    const hoja = workbook.getWorksheet('Sugerido de compra')!;
    expect(hoja.getRow(4).values).toEqual([
      undefined, 'SKU', 'Producto', 'Categoría', 'Marca', 'Stock actual', 'Stock mínimo', 'Cantidad a comprar', 'Costo estimado',
    ]);
    expect(hoja.getCell('H6').value).toMatchObject({ formula: 'SUM(H5:H5)' });
  });

  it('rechaza productos que ya no están bajo el mínimo', async () => {
    await expect(service.exportar({ items: [{ idProducto: 99, cantidad: 1 }] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
