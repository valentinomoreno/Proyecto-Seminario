import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Sprint 4 – Fase 1: Devoluciones (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let sufijo: string;
  let idCliente: number;
  let idProducto: number;
  let idVentaReciente: number;
  let idVentaVieja: number;
  let detalleReciente: number;
  let detalleViejo: number;

  const STOCK_INICIAL = 30;
  const PRECIO_UNITARIO = 2000;
  const CANTIDAD_VENDIDA = 4;

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

    const cliente = await request(app.getHttpServer())
      .post('/clientes')
      .auth(adminToken, { type: 'bearer' })
      .send({
        nombre: 'Cliente',
        apellido: 'Devolucion',
        dniCuit: sufijo,
        email: `devolucion.${sufijo}@example.com`,
      })
      .expect(201);
    idCliente = cliente.body.idCliente as number;

    const [categorias, marcas, estantes] = await Promise.all([
      request(app.getHttpServer()).get('/categorias').auth(adminToken, { type: 'bearer' }).expect(200),
      request(app.getHttpServer()).get('/marcas').auth(adminToken, { type: 'bearer' }).expect(200),
      request(app.getHttpServer()).get('/estantes').auth(adminToken, { type: 'bearer' }).expect(200),
    ]);
    const producto = await request(app.getHttpServer())
      .post('/productos')
      .auth(adminToken, { type: 'bearer' })
      .send({
        nombre: `Producto Devolucion E2E ${sufijo}`,
        descripcion: 'Producto de prueba para devoluciones',
        stock: STOCK_INICIAL,
        precioUnitario: PRECIO_UNITARIO,
        categoriaId: categorias.body[0].idCategoria,
        marcaId: marcas.body[0].idMarca,
        estanteId: estantes.body[0].idEstante,
      })
      .expect(201);
    idProducto = producto.body.idProducto as number;

    const ventaReciente = await request(app.getHttpServer())
      .post('/ventas')
      .auth(adminToken, { type: 'bearer' })
      .send({ idCliente, items: [{ idProducto, cantidad: CANTIDAD_VENDIDA }] })
      .expect(201);
    idVentaReciente = ventaReciente.body.idVenta as number;
    detalleReciente = ventaReciente.body.detalles[0].idVentaDetalle as number;

    const ventaVieja = await request(app.getHttpServer())
      .post('/ventas')
      .auth(adminToken, { type: 'bearer' })
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] })
      .expect(201);
    idVentaVieja = ventaVieja.body.idVenta as number;
    detalleViejo = ventaVieja.body.detalles[0].idVentaDetalle as number;

    // Envejecemos la segunda venta para poder probar el rechazo por plazo vencido.
    await dataSource.query("UPDATE ventas SET fecha = now() - interval '20 days' WHERE id_venta = $1", [idVentaVieja]);
  });

  afterAll(async () => {
    const ventas = [idVentaReciente, idVentaVieja].filter(Boolean);
    for (const idVenta of ventas) {
      await dataSource.query(
        'DELETE FROM movimientos_stock WHERE id_devolucion IN (SELECT d.id_devolucion FROM devoluciones d JOIN ventas_detalle vd ON vd.id_venta_detalle = d.id_venta_detalle WHERE vd.id_venta = $1)',
        [idVenta],
      );
      await dataSource.query(
        'DELETE FROM notas_credito WHERE id_devolucion IN (SELECT d.id_devolucion FROM devoluciones d JOIN ventas_detalle vd ON vd.id_venta_detalle = d.id_venta_detalle WHERE vd.id_venta = $1)',
        [idVenta],
      );
      await dataSource.query(
        'DELETE FROM devoluciones WHERE id_venta_detalle IN (SELECT id_venta_detalle FROM ventas_detalle WHERE id_venta = $1)',
        [idVenta],
      );
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

  it('rechaza la devolución de una venta con más de 15 días con un mensaje claro (RNF-10)', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/devoluciones')
      .auth(adminToken, { type: 'bearer' })
      .send({ idVentaDetalle: detalleViejo, cantidad: 1, motivo: 'Fuera de plazo', aptoReingreso: true })
      .expect(400);

    expect(String(body.message)).toMatch(/plazo de 15 días/i);
  });

  it('registra la devolución, reingresa el stock, emite nota de crédito y acredita la cuenta corriente', async () => {
    const stockAntes = (await request(app.getHttpServer())
      .get(`/productos/${idProducto}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)).body.stock as number;

    const saldoAntes = Number((await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)).body.saldo);

    const cantidadDevuelta = 2;
    const { body: devolucion } = await request(app.getHttpServer())
      .post('/devoluciones')
      .auth(adminToken, { type: 'bearer' })
      .send({
        idVentaDetalle: detalleReciente,
        cantidad: cantidadDevuelta,
        motivo: 'Repuesto incorrecto',
        aptoReingreso: true,
      })
      .expect(201);

    expect(Number(devolucion.montoDevuelto)).toBe(PRECIO_UNITARIO * cantidadDevuelta);
    expect(devolucion.notaCredito.numero).toMatch(/^NC-\d{5}$/);
    expect(Number(devolucion.notaCredito.monto)).toBe(PRECIO_UNITARIO * cantidadDevuelta);
    // RNF-05: queda asentado quién autorizó la operación.
    expect(devolucion.empleadoAutoriza.idEmpleado).toBeGreaterThan(0);

    const stockDespues = (await request(app.getHttpServer())
      .get(`/productos/${idProducto}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)).body.stock as number;
    expect(stockDespues).toBe(stockAntes + cantidadDevuelta);

    const movimientos = await dataSource.query<Array<{ tipo: string; cantidad: number }>>(
      'SELECT tipo, cantidad FROM movimientos_stock WHERE id_devolucion = $1',
      [devolucion.idDevolucion],
    );
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].tipo).toBe('DEVOLUCION');

    const cuenta = await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Number(cuenta.body.saldo)).toBe(saldoAntes - PRECIO_UNITARIO * cantidadDevuelta);
    const movimientos = cuenta.body.movimientos as Array<{ tipo: string }>;
    expect(movimientos.some((m) => m.tipo === 'NOTA_CREDITO')).toBe(true);
  });

  it('descuenta la cantidad ya devuelta del disponible del ítem', async () => {
    const venta = await request(app.getHttpServer())
      .get(`/ventas/${idVentaReciente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const detalle = venta.body.detalles[0];
    expect(detalle.cantidadDevuelta).toBe(2);
    expect(detalle.cantidadDisponibleDevolucion).toBe(CANTIDAD_VENDIDA - 2);
  });

  it('rechaza devolver más unidades de las disponibles', async () => {
    await request(app.getHttpServer())
      .post('/devoluciones')
      .auth(adminToken, { type: 'bearer' })
      .send({ idVentaDetalle: detalleReciente, cantidad: 99, motivo: 'Excede lo vendido', aptoReingreso: false })
      .expect(400);
  });

  it('no modifica el stock cuando el producto no está apto para reventa', async () => {
    const stockAntes = (await request(app.getHttpServer())
      .get(`/productos/${idProducto}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)).body.stock as number;

    await request(app.getHttpServer())
      .post('/devoluciones')
      .auth(adminToken, { type: 'bearer' })
      .send({ idVentaDetalle: detalleReciente, cantidad: 1, motivo: 'Roto, no revendible', aptoReingreso: false })
      .expect(201);

    const stockDespues = (await request(app.getHttpServer())
      .get(`/productos/${idProducto}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)).body.stock as number;
    expect(stockDespues).toBe(stockAntes);
  });
});
