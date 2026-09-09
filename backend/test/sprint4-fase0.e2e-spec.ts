import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Sprint 4 – Fase 0: Clientes, Ventas y Cuenta Corriente (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let sufijo: string;
  let idCliente: number;
  let idProducto: number;
  let idVenta: number;

  const STOCK_INICIAL = 20;
  const PRECIO_UNITARIO = 1500;
  const CANTIDAD_VENDIDA = 3;
  const TOTAL_ESPERADO = PRECIO_UNITARIO * CANTIDAD_VENDIDA;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);
    sufijo = Date.now().toString().slice(-8);

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_ADMIN_USERNAME || 'admin',
      contrasena: process.env.SEED_ADMIN_PASSWORD || 'Admin_Seguro.2026!',
    }).expect(200);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    if (idVenta) {
      await dataSource.query('DELETE FROM movimientos_cta_cte WHERE id_venta = $1', [idVenta]);
      await dataSource.query('DELETE FROM movimientos_stock WHERE id_venta = $1', [idVenta]);
      await dataSource.query('DELETE FROM ventas_detalle WHERE id_venta = $1', [idVenta]);
      await dataSource.query('DELETE FROM ventas WHERE id_venta = $1', [idVenta]);
    }
    if (idCliente) {
      await dataSource.query(
        'DELETE FROM movimientos_cta_cte WHERE id_cuenta_corriente IN (SELECT id_cuenta_corriente FROM cuentas_corrientes WHERE id_cliente = $1)',
        [idCliente],
      );
      await dataSource.query('DELETE FROM cuentas_corrientes WHERE id_cliente = $1', [idCliente]);
      await dataSource.query('DELETE FROM clientes WHERE id_cliente = $1', [idCliente]);
    }
    if (idProducto) {
      await dataSource.query('DELETE FROM movimientos_stock WHERE id_producto = $1', [idProducto]);
      await dataSource.query('DELETE FROM productos WHERE id_producto = $1', [idProducto]);
    }
    await app.close();
  });

  it('da de alta un cliente y le crea automáticamente su cuenta corriente en cero', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/clientes')
      .auth(adminToken, { type: 'bearer' })
      .send({
        nombre: 'Cliente',
        apellido: 'E2E',
        dniCuit: sufijo,
        email: `cliente.e2e.${sufijo}@example.com`,
        telefono: '3810000000',
      })
      .expect(201);

    idCliente = body.idCliente as number;
    expect(idCliente).toBeGreaterThan(0);

    const cuenta = await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Number(cuenta.body.saldo)).toBe(0);
  });

  it('registra una venta que descuenta stock, deja kardex e imputa la cuenta corriente', async () => {
    const [categorias, marcas, estantes] = await Promise.all([
      request(app.getHttpServer()).get('/categorias').auth(adminToken, { type: 'bearer' }).expect(200),
      request(app.getHttpServer()).get('/marcas').auth(adminToken, { type: 'bearer' }).expect(200),
      request(app.getHttpServer()).get('/estantes').auth(adminToken, { type: 'bearer' }).expect(200),
    ]);

    const producto = await request(app.getHttpServer())
      .post('/productos')
      .auth(adminToken, { type: 'bearer' })
      .send({
        nombre: `Producto Venta E2E ${sufijo}`,
        descripcion: 'Producto de prueba para el flujo de ventas',
        stock: STOCK_INICIAL,
        precioUnitario: PRECIO_UNITARIO,
        categoriaId: categorias.body[0].idCategoria,
        marcaId: marcas.body[0].idMarca,
        estanteId: estantes.body[0].idEstante,
      })
      .expect(201);
    idProducto = producto.body.idProducto as number;

    const venta = await request(app.getHttpServer())
      .post('/ventas')
      .auth(adminToken, { type: 'bearer' })
      .send({ idCliente, items: [{ idProducto, cantidad: CANTIDAD_VENDIDA }] })
      .expect(201);

    idVenta = venta.body.idVenta as number;
    expect(venta.body.numeroComprobante).toMatch(/^V-\d{5}$/);
    expect(Number(venta.body.total)).toBe(TOTAL_ESPERADO);
    expect(venta.body.detalles[0].cantidadDisponibleDevolucion).toBe(CANTIDAD_VENDIDA);

    const productoLuego = await request(app.getHttpServer())
      .get(`/productos/${idProducto}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(productoLuego.body.stock).toBe(STOCK_INICIAL - CANTIDAD_VENDIDA);

    const movimientosStock = await dataSource.query<Array<{ tipo: string; cantidad: number; stock_resultante: number }>>(
      'SELECT tipo, cantidad, stock_resultante FROM movimientos_stock WHERE id_venta = $1',
      [idVenta],
    );
    expect(movimientosStock).toHaveLength(1);
    expect(movimientosStock[0].tipo).toBe('VENTA');
    expect(movimientosStock[0].cantidad).toBe(CANTIDAD_VENDIDA);
    expect(movimientosStock[0].stock_resultante).toBe(STOCK_INICIAL - CANTIDAD_VENDIDA);

    const cuenta = await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Number(cuenta.body.saldo)).toBe(TOTAL_ESPERADO);
    const imputacion = cuenta.body.movimientos.find((m: { tipo: string }) => m.tipo === 'IMPUTACION_VENTA');
    expect(imputacion).toBeDefined();
    expect(Number(imputacion.monto)).toBe(TOTAL_ESPERADO);
  });

  it('permite buscar la venta por número de comprobante', async () => {
    const venta = await request(app.getHttpServer())
      .get(`/ventas/${idVenta}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const porComprobante = await request(app.getHttpServer())
      .get(`/ventas/comprobante/${venta.body.numeroComprobante}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(porComprobante.body.idVenta).toBe(idVenta);
  });

  it('rechaza una venta con stock insuficiente', async () => {
    await request(app.getHttpServer())
      .post('/ventas')
      .auth(adminToken, { type: 'bearer' })
      .send({ idCliente, items: [{ idProducto, cantidad: STOCK_INICIAL * 10 }] })
      .expect(400);
  });

  it('registra un pago manual que reduce el saldo de la cuenta corriente', async () => {
    const pago = 500;
    await request(app.getHttpServer())
      .post(`/cuentas-corrientes/${idCliente}/pagos`)
      .auth(adminToken, { type: 'bearer' })
      .send({ monto: pago, observaciones: 'Pago parcial e2e' })
      .expect(201);

    const cuenta = await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Number(cuenta.body.saldo)).toBe(TOTAL_ESPERADO - pago);

    const movimientoPago = cuenta.body.movimientos.find((m: { tipo: string }) => m.tipo === 'PAGO');
    expect(Number(movimientoPago.monto)).toBe(-pago);
  });

  it('rechaza un pago mayor al saldo adeudado', async () => {
    await request(app.getHttpServer())
      .post(`/cuentas-corrientes/${idCliente}/pagos`)
      .auth(adminToken, { type: 'bearer' })
      .send({ monto: TOTAL_ESPERADO * 100 })
      .expect(400);
  });
});
