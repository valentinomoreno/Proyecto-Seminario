import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { MercadoPagoClient } from '../src/modules/pagos/mercado-pago.client';
import { PagosService } from '../src/modules/pagos/pagos.service';

describe('Pagos QR simulados sin Mercado Pago (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let pagos: PagosService;
  let token: string;
  let idProducto: number;
  let idCliente: number;
  let idVenta: number | null = null;
  const idsOrdenes: string[] = [];
  const anterior = process.env.MP_SIMULATOR_ENABLED;
  const clienteMp = {
    configured: () => false,
    crear: jest.fn(), consultar: jest.fn(), cancelar: jest.fn(),
  };

  beforeAll(async () => {
    process.env.MP_SIMULATOR_ENABLED = 'true';
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MercadoPagoClient).useValue(clienteMp).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    db = app.get(DataSource);
    pagos = app.get(PagosService);
    token = (await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_VENTA_USERNAME || 'vendedor',
      contrasena: process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!',
    }).expect(200)).body.accessToken as string;
    const [referencia] = await db.query<Array<{ id_categoria: number; id_marca: number; id_estante: number }>>(
      'SELECT id_categoria,id_marca,id_estante FROM productos LIMIT 1');
    const [cliente] = await db.query<Array<{ id_cliente: number }>>('SELECT id_cliente FROM clientes WHERE fecha_baja IS NULL LIMIT 1');
    idCliente = cliente.id_cliente;
    const [producto] = await db.query<Array<{ id_producto: number }>>(`
      INSERT INTO productos (sku,nombre,descripcion,stock,precio_unitario,id_categoria,id_marca,id_estante)
      VALUES ($1,'Test QR simulado','Prueba local',2,1200,$2,$3,$4) RETURNING id_producto`,
    [`TEST-SIM-${randomUUID()}`, referencia.id_categoria, referencia.id_marca, referencia.id_estante]);
    idProducto = producto.id_producto;
  });

  afterAll(async () => {
    for (const id of idsOrdenes) await db.query('DELETE FROM pagos_qr WHERE id=$1', [id]);
    if (idVenta) {
      await db.query('DELETE FROM movimientos_stock WHERE id_venta=$1', [idVenta]);
      await db.query('DELETE FROM ventas WHERE id_venta=$1', [idVenta]);
    }
    if (idProducto) await db.query('DELETE FROM productos WHERE id_producto=$1', [idProducto]);
    await app?.close();
    if (anterior === undefined) delete process.env.MP_SIMULATOR_ENABLED;
    else process.env.MP_SIMULATOR_ENABLED = anterior;
  });

  async function crearOrden() {
    const respuesta = await request(app.getHttpServer()).post('/pagos/mercado-pago/ordenes')
      .auth(token, { type: 'bearer' }).set('Idempotency-Key', randomUUID())
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
    idsOrdenes.push(respuesta.body.id as string);
    return respuesta.body as { id: string; estado: string; qrData: string; simulado: boolean };
  }

  it('acredita una sola venta con cobro y factura sin llamar al proveedor', async () => {
    const orden = await crearOrden();
    expect(orden).toMatchObject({ estado: 'PENDIENTE', simulado: true });
    expect(orden.qrData).toContain('SIMULACION-QR:');
    const [reservado] = await db.query<Array<{ stock: number; stock_reservado: number }>>(
      'SELECT stock,stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(reservado).toMatchObject({ stock: 2, stock_reservado: 1 });
    await request(app.getHttpServer()).post(`/pagos/mercado-pago/ordenes/${orden.id}/simular-acreditacion`)
      .expect(401);
    const entornoAnterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer()).post(`/pagos/mercado-pago/ordenes/${orden.id}/simular-acreditacion`)
        .auth(token, { type: 'bearer' }).expect(403);
    } finally {
      if (entornoAnterior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = entornoAnterior;
    }
    const acreditada = await request(app.getHttpServer())
      .post(`/pagos/mercado-pago/ordenes/${orden.id}/simular-acreditacion`)
      .auth(token, { type: 'bearer' }).expect(201);
    idVenta = acreditada.body.idVenta as number;
    expect(acreditada.body).toMatchObject({ estado: 'APROBADO', simulado: true, reservaActiva: false });
    const repetida = await request(app.getHttpServer())
      .post(`/pagos/mercado-pago/ordenes/${orden.id}/simular-acreditacion`)
      .auth(token, { type: 'bearer' }).expect(201);
    expect(repetida.body.idVenta).toBe(idVenta);
    const [conteo] = await db.query<Array<{ ventas: string; cobros: string; facturas: string; movimientos: string }>>(`
      SELECT (SELECT count(*) FROM ventas WHERE id_venta=$1)::text ventas,
        (SELECT count(*) FROM cobros WHERE id_venta=$1 AND metodo_cobro='MERCADO_PAGO')::text cobros,
        (SELECT count(*) FROM facturas WHERE id_venta=$1)::text facturas,
        (SELECT count(*) FROM movimientos_stock WHERE id_venta=$1)::text movimientos`, [idVenta]);
    expect(conteo).toEqual({ ventas: '1', cobros: '1', facturas: '1', movimientos: '1' });
    const [producto] = await db.query<Array<{ stock: number; stock_reservado: number }>>(
      'SELECT stock,stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(producto).toMatchObject({ stock: 1, stock_reservado: 0 });
    expect(clienteMp.crear).not.toHaveBeenCalled();
    expect(clienteMp.consultar).not.toHaveBeenCalled();
    expect(clienteMp.cancelar).not.toHaveBeenCalled();
  });

  it('cancela y vence reservas simuladas sin venta', async () => {
    const cancelable = await crearOrden();
    const cancelada = await request(app.getHttpServer())
      .post(`/pagos/mercado-pago/ordenes/${cancelable.id}/cancelar`)
      .auth(token, { type: 'bearer' }).expect(201);
    expect(cancelada.body).toMatchObject({ estado: 'CANCELADO', idVenta: null });
    const vencible = await crearOrden();
    await db.query("UPDATE pagos_qr SET vence_en=now()-interval '1 minute', actualizado_en=now()-interval '1 minute' WHERE id=$1", [vencible.id]);
    await pagos.conciliar();
    const vencida = await request(app.getHttpServer()).get(`/pagos/mercado-pago/ordenes/${vencible.id}`)
      .auth(token, { type: 'bearer' }).expect(200);
    expect(vencida.body).toMatchObject({ estado: 'EXPIRADO', idVenta: null });
    const [producto] = await db.query<Array<{ stock: number; stock_reservado: number }>>(
      'SELECT stock,stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(producto).toMatchObject({ stock: 1, stock_reservado: 0 });
    expect(clienteMp.crear).not.toHaveBeenCalled();
    expect(clienteMp.consultar).not.toHaveBeenCalled();
    expect(clienteMp.cancelar).not.toHaveBeenCalled();
  });
});
