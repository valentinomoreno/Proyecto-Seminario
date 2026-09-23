import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExportarSugeridoCompraDto } from '../dto/sugerido-compra.dto';
import { Producto } from '../entities/producto.entity';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from '../repositories/interfaces/productos-repository.interface';

export interface AlertaStockResponse {
  idProducto: number;
  sku: string;
  nombre: string;
  categoria: string;
  marca: string;
  stockActual: number;
  stockMinimo: number;
  puntoPedido: number;
  cantidadSugerida: number;
  precioCosto: number | null;
}

@Injectable()
export class AlertasStockService {
  constructor(
    @Inject(PRODUCTOS_REPOSITORY) private readonly productosRepository: IProductosRepository,
  ) {}

  async evaluar(): Promise<{ generadoEn: string; total: number; productos: AlertaStockResponse[] }> {
    const productos = await this.productosRepository.findBajoMinimo();
    return {
      generadoEn: new Date().toISOString(),
      total: productos.length,
      productos: productos.map((producto) => this.toResponse(producto)),
    };
  }

  async exportar(dto: ExportarSugeridoCompraDto): Promise<Buffer> {
    const alertas = await this.productosRepository.findBajoMinimo();
    const porId = new Map(alertas.map((producto) => [producto.idProducto, producto]));
    const idsRepetidos = dto.items.some((item, index) =>
      dto.items.findIndex((otro) => otro.idProducto === item.idProducto) !== index,
    );
    if (idsRepetidos) throw new BadRequestException('No puede repetir productos en el sugerido de compra.');

    const items = dto.items.map((item) => {
      const producto = porId.get(item.idProducto);
      if (!producto) {
        throw new BadRequestException(`El producto ${item.idProducto} ya no se encuentra bajo el stock mínimo.`);
      }
      return { producto, cantidad: item.cantidad };
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Repuestos';
    workbook.created = new Date();
    const hoja = workbook.addWorksheet('Sugerido de compra', {
      views: [{ state: 'frozen', ySplit: 4 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    hoja.mergeCells('A1:I1');
    const titulo = hoja.getCell('A1');
    titulo.value = 'SUGERIDO DE COMPRA AL PROVEEDOR';
    titulo.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1677FF' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    hoja.getRow(1).height = 28;

    hoja.mergeCells('A2:I2');
    hoja.getCell('A2').value = `Generado: ${new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date())} · Cantidades revisadas por el administrador`;
    hoja.getCell('A2').font = { italic: true, color: { argb: 'FF555555' } };

    hoja.columns = [
      { key: 'sku', width: 16 },
      { key: 'producto', width: 34 },
      { key: 'categoria', width: 23 },
      { key: 'marca', width: 20 },
      { key: 'stock', width: 13 },
      { key: 'minimo', width: 13 },
      { key: 'pedido', width: 16 },
      { key: 'cantidad', width: 18 },
      { key: 'costo', width: 18 },
    ];

    const encabezados = ['SKU', 'Producto', 'Categoría', 'Marca', 'Stock actual', 'Stock mínimo', 'Punto pedido', 'Cantidad a comprar', 'Costo estimado'];
    hoja.addRow([]);
    const header = hoja.addRow(encabezados);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
    header.alignment = { horizontal: 'center' };

    for (const { producto, cantidad } of items) {
      const costo = producto.precioCosto === null ? null : producto.precioCosto * cantidad;
      const fila = hoja.addRow([
        producto.sku,
        producto.nombre,
        producto.categoria.nombre,
        producto.marca.nombre,
        producto.stock,
        producto.stockMinimo,
        producto.puntoPedido,
        cantidad,
        costo,
      ]);
      fila.getCell(9).numFmt = '$ #,##0.00';
    }

    const filaTotal = hoja.addRow(['', '', '', '', '', '', '', 'TOTAL ESTIMADO', {
      formula: `SUM(I5:I${4 + items.length})`,
    }]);
    filaTotal.font = { bold: true };
    filaTotal.getCell(9).numFmt = '$ #,##0.00';
    hoja.autoFilter = `A4:I${4 + items.length}`;

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  private toResponse(producto: Producto): AlertaStockResponse {
    return {
      idProducto: producto.idProducto,
      sku: producto.sku,
      nombre: producto.nombre,
      categoria: producto.categoria.nombre,
      marca: producto.marca.nombre,
      stockActual: producto.stock,
      stockMinimo: producto.stockMinimo,
      puntoPedido: producto.puntoPedido,
      cantidadSugerida: Math.max(1, producto.puntoPedido - producto.stock),
      precioCosto: producto.precioCosto,
    };
  }
}
