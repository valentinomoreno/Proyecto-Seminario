import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Alertas, dashboard e importación masiva (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let sufijo: string;
  let idProducto: number;
  let skuProducto: string;
  let nombreArchivoImportacion: string;
  let referencia: {
    id_categoria: number;
    id_marca: number;
    id_estante: number;
    categoria: string;
    marca: string;
    deposito: string;
    sector: string;
    estante: string;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);
    sufijo = Date.now().toString().slice(-8);
    nombreArchivoImportacion = `productos-${sufijo}.csv`;

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_ADMIN_USERNAME || 'admin',
      contrasena: process.env.SEED_ADMIN_PASSWORD || 'Admin_Seguro.2026!',
    }).expect(200);
    token = login.body.accessToken as string;

    const referencias = await dataSource.query<Array<typeof referencia>>(`
      SELECT categoria.id_categoria, marca.id_marca, estante.id_estante,
        categoria.nombre AS categoria, marca.nombre AS marca,
        deposito.nombre AS deposito, sector.nombre AS sector, estante.codigo AS estante
      FROM categorias_marcas relacion
      JOIN categorias categoria ON categoria.id_categoria = relacion.id_categoria AND categoria.fecha_baja IS NULL
      JOIN marcas marca ON marca.id_marca = relacion.id_marca AND marca.fecha_baja IS NULL
      CROSS JOIN LATERAL (
        SELECT e.id_estante, e.codigo, e.id_sector FROM estantes e WHERE e.fecha_baja IS NULL LIMIT 1
      ) estante
      JOIN sectores sector ON sector.id_sector = estante.id_sector
      JOIN depositos deposito ON deposito.id_deposito = sector.id_deposito
      LIMIT 1
    `);
    referencia = referencias[0];
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM importaciones_productos WHERE nombre_archivo = $1', [nombreArchivoImportacion]);
    await dataSource.query('DELETE FROM productos WHERE nombre LIKE $1', [`%${sufijo}%`]);
    await app.close();
  });

  it('crea un producto con niveles y lo detecta bajo el mínimo', async () => {
    const producto = await request(app.getHttpServer())
      .post('/productos')
      .auth(token, { type: 'bearer' })
      .send({
        nombre: `Alerta Stock E2E ${sufijo}`,
        stock: 2,
        stockMinimo: 3,
        puntoPedido: 10,
        precioCosto: 1000,
        precioUnitario: 1800,
        categoriaId: referencia.id_categoria,
        marcaId: referencia.id_marca,
        estanteId: referencia.id_estante,
      })
      .expect(201);
    idProducto = producto.body.idProducto as number;
    skuProducto = producto.body.sku as string;
    expect(producto.body).toMatchObject({ stockMinimo: 3, puntoPedido: 10, precioCosto: 1000 });

    const alertas = await request(app.getHttpServer())
      .get('/stock/alertas')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(alertas.body.productos).toEqual(expect.arrayContaining([
      expect.objectContaining({ idProducto, cantidadSugerida: 8 }),
    ]));
  });

  it('exporta el sugerido revisado como Excel', async () => {
    const response = await request(app.getHttpServer())
      .post('/stock/alertas/exportar')
      .auth(token, { type: 'bearer' })
      .send({ items: [{ idProducto, cantidad: 15 }] })
      .expect(201);
    expect(response.headers['content-type']).toContain('spreadsheetml');
    expect(Number(response.headers['content-length'])).toBeGreaterThan(1000);
  });

  it('previsualiza y confirma altas y actualizaciones por SKU sin duplicar productos', async () => {
    const csv = [
      ['sku', 'nombre', 'descripcion', 'precio_costo', 'precio_venta', 'stock_inicial', 'stock_minimo', 'punto_pedido', 'categoria', 'marca', 'deposito', 'sector', 'estante'].join(','),
      [skuProducto, '', '', '', '2100', '', '', '', '', '', '', '', ''].join(','),
      [`E2E-${sufijo}`, `Importado E2E ${sufijo}`, 'Correcto', '1200', '2000', '8', '2', '9', referencia.categoria, referencia.marca, referencia.deposito, referencia.sector, referencia.estante].join(','),
      [`E2E-ERR-${sufijo}`, `Inválido E2E ${sufijo}`, 'Precio incorrecto', '1200', 'NO_ES_PRECIO', '8', '2', '9', referencia.categoria, referencia.marca, referencia.deposito, referencia.sector, referencia.estante].join(','),
    ].join('\n');
    const previsualizacion = await request(app.getHttpServer())
      .post('/productos/importacion/previsualizar')
      .auth(token, { type: 'bearer' })
      .attach('archivo', Buffer.from(csv), { filename: nombreArchivoImportacion, contentType: 'text/csv' })
      .expect(201);
    expect(previsualizacion.body).toMatchObject({
      totalFilas: 3,
      resumen: { nuevos: 1, actualizar: 1, sinCambios: 0, errores: 1 },
    });
    expect(previsualizacion.body.filas).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: skuProducto, idProducto, estado: 'ACTUALIZAR' }),
      expect.objectContaining({ sku: `E2E-${sufijo}`, estado: 'NUEVO' }),
      expect.objectContaining({ fila: 4, sku: `E2E-ERR-${sufijo}`, estado: 'ERROR' }),
    ]));
    const antes = await dataSource.query<Array<{ precio_unitario: string }>>(
      'SELECT precio_unitario FROM productos WHERE id_producto = $1', [idProducto],
    );
    expect(Number(antes[0].precio_unitario)).toBe(1800);

    const resultado = await request(app.getHttpServer())
      .post('/productos/importacion/confirmar')
      .auth(token, { type: 'bearer' })
      .field('token', previsualizacion.body.token as string)
      .attach('archivo', Buffer.from(csv), { filename: nombreArchivoImportacion, contentType: 'text/csv' })
      .expect(201);
    expect(resultado.body).toMatchObject({ totalProcesados: 3, creados: 1, actualizados: 1, sinCambios: 0, errores: 1 });
    expect(resultado.body.detalleErrores[0]).toMatchObject({ fila: 4, sku: `E2E-ERR-${sufijo}` });

    const despues = await dataSource.query<Array<{ id_producto: number; precio_unitario: string }>>(
      'SELECT id_producto, precio_unitario FROM productos WHERE sku = $1', [skuProducto],
    );
    expect(despues[0].id_producto).toBe(idProducto);
    expect(Number(despues[0].precio_unitario)).toBe(2100);
    const nuevos = await dataSource.query<Array<{ total: string }>>('SELECT COUNT(*)::text AS total FROM productos WHERE sku = $1', [`E2E-${sufijo}`]);
    expect(Number(nuevos[0].total)).toBe(1);

    const historial = await request(app.getHttpServer()).get('/productos/importaciones').auth(token, { type: 'bearer' }).expect(200);
    expect(historial.body).toEqual(expect.arrayContaining([expect.objectContaining({ nombreArchivo: nombreArchivoImportacion, creados: 1, actualizados: 1, errores: 1 })]));
  });

  it('expone métricas consolidadas para el administrador', async () => {
    const dashboard = await request(app.getHttpServer())
      .get('/dashboard')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(dashboard.body.ventas.puntos.length).toBeGreaterThanOrEqual(28);
    expect(dashboard.body.metodosPago).toHaveLength(4);
    expect(dashboard.body.cuentas.resumen).toEqual(expect.objectContaining({ alDia: expect.any(Number) }));
    expect(dashboard.body.inventario.alertasStock).toBeGreaterThanOrEqual(1);
  });
});
