import { BadRequestException } from '@nestjs/common';
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
    puntoPedido: 10,
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

  it('detecta stock bajo el mínimo y sugiere reponer hasta el punto de pedido', async () => {
    const resultado = await service.evaluar();
    expect(resultado.total).toBe(1);
    expect(resultado.productos[0]).toMatchObject({ stockActual: 2, cantidadSugerida: 8 });
  });

  it('genera un Excel con cantidades revisadas', async () => {
    const archivo = await service.exportar({ items: [{ idProducto: 1, cantidad: 12 }] });
    expect(Buffer.isBuffer(archivo)).toBe(true);
    expect(archivo.length).toBeGreaterThan(1000);
  });

  it('rechaza productos que ya no están bajo el mínimo', async () => {
    await expect(service.exportar({ items: [{ idProducto: 99, cantidad: 1 }] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
