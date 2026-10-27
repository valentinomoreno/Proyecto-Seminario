import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { MercadoPagoClient, MercadoPagoHttpError, OrdenMp } from '../src/modules/pagos/mercado-pago.client';
import { PagosService } from '../src/modules/pagos/pagos.service';

describe('Sprint 5 - QR y reportes (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let pagos: PagosService;
  let admin: string;
  let vendedor: string;
  let idProducto: number;
  let idCliente: number;
  let ordenId: string;
  let ordenMpId: string;
  let ventaId: number;
  let devolucionId: number;
  let monto: number;
  const intentos: string[] = [];
  const idsMp: string[] = [];
  const ventasReporte: number[] = [];
  const ordenes = new Map<string, OrdenMp>();
  const clienteMp = {
    configured: () => true,
    crear: jest.fn((referencia: string, _clave: string, total: string) => {
      const id = `ORDTEST${randomUUID().replaceAll('-', '').toUpperCase()}`;
      const orden: OrdenMp = {
        id, status: 'created', total_amount: total, currency: 'ARS',
        external_reference: referencia, type_response: { qr_data: `QR-${id}` },
        transactions: { payments: [{ id: `PAY${id}`, amount: total, status: 'created' }] },
      };
      ordenes.set(id, orden);
      return Promise.resolve(orden);
    }),
    consultar: jest.fn((id: string) => Promise.resolve(ordenes.get(id)!)),
    cancelar: jest.fn((id: string) => {
      const orden = ordenes.get(id)!;
      orden.status = 'canceled';
      return Promise.resolve(orden);
    }),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    process.env.MP_WEBHOOK_SECRET = 'sprint5-webhook-test-secret';
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MercadoPagoClient).useValue(clienteMp).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    db = app.get(DataSource);
    pagos = app.get(PagosService);
    const login = async (nombre: string, contrasena: string) => (await request(app.getHttpServer())
      .post('/auth/login').send({ nombre, contrasena }).expect(200)).body.accessToken as string;
    admin = await login(process.env.SEED_ADMIN_USERNAME || 'admin', process.env.SEED_ADMIN_PASSWORD || 'Admin_Seguro.2026!');
    vendedor = await login(process.env.SEED_VENTA_USERNAME || 'vendedor', process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!');
    const [referencia] = await db.query<Array<{ id_categoria: number; id_marca: number; id_estante: number }>>(
      'SELECT id_categoria,id_marca,id_estante FROM productos LIMIT 1');
    const [cliente] = await db.query<Array<{ id_cliente: number }>>('SELECT id_cliente FROM clientes WHERE fecha_baja IS NULL LIMIT 1');
    idCliente = cliente.id_cliente;
    const [producto] = await db.query<Array<{ id_producto: number }>>(`
      INSERT INTO productos (sku,nombre,descripcion,stock,precio_unitario,id_categoria,id_marca,id_estante)
      VALUES ($1,'Test Sprint 5','Prueba QR',3,1200,$2,$3,$4) RETURNING id_producto`,
    [`TEST-S5-${Date.now()}`, referencia.id_categoria, referencia.id_marca, referencia.id_estante]);
    idProducto = producto.id_producto;
  });

  afterAll(async () => {
    for (const idMp of idsMp) await db.query('DELETE FROM pagos_qr_eventos WHERE id_orden_mp=$1', [idMp]);
    for (const intento of intentos) {
      await db.query('DELETE FROM pagos_qr WHERE id=$1', [intento]);
    }
    if (devolucionId) {
      await db.query('DELETE FROM notas_credito WHERE id_devolucion=$1', [devolucionId]);
      await db.query('DELETE FROM devoluciones WHERE id_devolucion=$1', [devolucionId]);
    }
    if (ventaId) {
      await db.query('DELETE FROM movimientos_stock WHERE id_venta=$1', [ventaId]);
      await db.query('DELETE FROM ventas WHERE id_venta=$1', [ventaId]);
    }
    if (ventasReporte.length) await db.query('DELETE FROM ventas WHERE id_venta = ANY($1)', [ventasReporte]);
    if (idProducto) await db.query('DELETE FROM productos WHERE id_producto=$1', [idProducto]);
    await app?.close();
    delete process.env.MP_WEBHOOK_SECRET;
  });

  it('reserva stock e impide que otra venta use la unidad reservada', async () => {
    const clave = randomUUID();
    const respuesta = await request(app.getHttpServer())
      .post('/pagos/mercado-pago/ordenes').auth(vendedor, { type: 'bearer' })
      .set('Idempotency-Key', clave)
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
    ordenId = respuesta.body.id as string;
    intentos.push(ordenId);
    monto = respuesta.body.monto as number;
    ordenMpId = [...ordenes.keys()][0];
    idsMp.push(ordenMpId);
    expect(respuesta.body).toMatchObject({ estado: 'PENDIENTE', qrData: `QR-${ordenMpId}` });
    const repetida = await request(app.getHttpServer()).post('/pagos/mercado-pago/ordenes')
      .auth(vendedor, { type: 'bearer' }).set('Idempotency-Key', clave)
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
    expect(repetida.body.id).toBe(ordenId);
    await request(app.getHttpServer()).post('/pagos/mercado-pago/ordenes')
      .auth(vendedor, { type: 'bearer' }).set('Idempotency-Key', clave)
      .send({ idCliente, items: [{ idProducto, cantidad: 2 }] }).expect(400);
    const [p] = await db.query<Array<{ stock: number; stock_reservado: number }>>(
      'SELECT stock,stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(p).toMatchObject({ stock: 3, stock_reservado: 1 });
    await request(app.getHttpServer()).post('/ventas').auth(vendedor, { type: 'bearer' })
      .send({ idCliente, modalidadPago: 'CONTADO', metodoCobro: 'EFECTIVO', items: [{ idProducto, cantidad: 3 }] })
      .expect(400);
    await request(app.getHttpServer()).post('/ventas').auth(vendedor, { type: 'bearer' })
      .send({ idCliente, modalidadPago: 'CONTADO', metodoCobro: 'MERCADO_PAGO', items: [{ idProducto, cantidad: 1 }] })
      .expect(400);
  });

  it('rechaza firmas falsas y acredita una sola venta ante webhooks duplicados', async () => {
    const body = { id: 'evento-sprint5', type: 'order', data: { id: ordenMpId } };
    await request(app.getHttpServer()).post('/pagos/webhook').query({ 'data.id': ordenMpId, type: 'order' })
      .set('x-request-id', 'request-sprint5').set('x-signature', 'ts=123,v1=deadbeef').send(body).expect(401);
    const orden = ordenes.get(ordenMpId)!;
    orden.status = 'processed';
    orden.transactions!.payments![0].status = 'processed';
    orden.transactions!.payments![0].status_detail = 'accredited';
    const ts = Date.now().toString();
    const firma = createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
      .update(`id:${ordenMpId};request-id:request-sprint5;ts:${ts};`).digest('hex');
    const enviar = () => request(app.getHttpServer()).post('/pagos/webhook')
      .query({ 'data.id': ordenMpId, type: 'order' })
      .set('x-request-id', 'request-sprint5').set('x-signature', `ts=${ts},v1=${firma}`)
      .send(body).expect(200);
    await enviar();
    await enviar();
    await pagos.conciliar();
    const estado = await request(app.getHttpServer()).get(`/pagos/mercado-pago/ordenes/${ordenId}`)
      .auth(vendedor, { type: 'bearer' }).expect(200);
    expect(estado.body.estado).toBe('APROBADO');
    ventaId = estado.body.idVenta as number;
    const venta = await request(app.getHttpServer()).get(`/ventas/${ventaId}`)
      .auth(vendedor, { type: 'bearer' }).expect(200);
    expect(venta.body.cobro.metodoCobro).toBe('MERCADO_PAGO');
    expect(venta.body.factura.cae).toBeNull();
    expect(Number(venta.body.total)).toBe(monto);
    await pagos.conciliar();
    const [cuenta] = await db.query<Array<{ total: string }>>('SELECT COUNT(*)::text total FROM cobros WHERE id_venta=$1', [ventaId]);
    expect(Number(cuenta.total)).toBe(1);
    const [p] = await db.query<Array<{ stock: number; stock_reservado: number }>>(
      'SELECT stock,stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(p).toMatchObject({ stock: 2, stock_reservado: 0 });
  });

  it('incluye la venta y descuenta una nota de crédito en los informes; restringe el acceso', async () => {
    await request(app.getHttpServer()).get('/reportes/ventas-mensuales').auth(vendedor, { type: 'bearer' }).expect(403);
    const [detalle] = await db.query<Array<{ id_detalle_venta: number }>>(
      'SELECT id_detalle_venta FROM detalles_venta WHERE id_venta=$1', [ventaId]);
    const [empleado] = await db.query<Array<{ id_empleado: number }>>('SELECT id_empleado FROM empleados LIMIT 1');
    const [devolucion] = await db.query<Array<{ id_devolucion: number }>>(`
      INSERT INTO devoluciones (id_venta_detalle,cantidad_devuelta,motivo,monto_devuelto,apto_reingreso,id_empleado_autoriza)
      VALUES ($1,1,'Prueba informe',$2,false,$3) RETURNING id_devolucion`,
    [detalle.id_detalle_venta, monto, empleado.id_empleado]);
    devolucionId = devolucion.id_devolucion;
    await db.query('INSERT INTO notas_credito (id_devolucion,numero,monto) VALUES ($1,$2,$3)',
      [devolucionId, `NC-S5-${Date.now()}`, monto]);
    const hoy = new Date().toISOString().slice(0, 10);
    const mensual = await request(app.getHttpServer()).get('/reportes/ventas-mensuales')
      .auth(admin, { type: 'bearer' }).query({ desde: hoy, hasta: hoy }).expect(200);
    const mes = (mensual.body as { data: Array<{ mes: string; operaciones: number; devoluciones: number }> }).data
      .find((item) => item.mes === hoy.slice(0, 7));
    expect(mes?.operaciones).toBeGreaterThanOrEqual(1);
    expect(mes?.devoluciones).toBeGreaterThanOrEqual(monto);
    const ranking = await request(app.getHttpServer()).get('/reportes/ranking-productos')
      .auth(admin, { type: 'bearer' }).query({ desde: hoy, hasta: hoy }).expect(200);
    expect(ranking.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ idProducto, cantidad: 0 }),
    ]));
    await request(app.getHttpServer()).get('/reportes/ventas-mensuales')
      .auth(admin, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/reportes/ranking-productos')
      .auth(admin, { type: 'bearer' }).query({ desde: '2026-02-31', hasta: hoy }).expect(400);
  });

  it('libera una reserva cancelada y otra expirada sin crear ventas', async () => {
    for (const final of ['canceled', 'expired']) {
      const respuesta = await request(app.getHttpServer())
        .post('/pagos/mercado-pago/ordenes').auth(vendedor, { type: 'bearer' })
        .set('Idempotency-Key', randomUUID())
        .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
      const id = respuesta.body.id as string;
      const mpId = [...ordenes.keys()].at(-1)!;
      intentos.push(id); idsMp.push(mpId);
      if (final === 'canceled') {
        await request(app.getHttpServer()).post(`/pagos/mercado-pago/ordenes/${id}/cancelar`)
          .auth(vendedor, { type: 'bearer' }).expect(201);
      } else {
        ordenes.get(mpId)!.status = 'expired';
        await pagos.recibirWebhook(`evento-expirado-${id}`, mpId);
        await pagos.conciliar();
      }
      const estado = await request(app.getHttpServer()).get(`/pagos/mercado-pago/ordenes/${id}`)
        .auth(vendedor, { type: 'bearer' }).expect(200);
      expect(estado.body).toMatchObject({ estado: final === 'canceled' ? 'CANCELADO' : 'EXPIRADO', idVenta: null });
      const [p] = await db.query<Array<{ stock_reservado: number }>>('SELECT stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
      expect(p.stock_reservado).toBe(0);
    }
  });

  it('serializa reservas concurrentes del mismo producto', async () => {
    const solicitudes = await Promise.all(Array.from({ length: 2 }, () => request(app.getHttpServer())
      .post('/pagos/mercado-pago/ordenes').auth(vendedor, { type: 'bearer' })
      .set('Idempotency-Key', randomUUID())
      .send({ idCliente, items: [{ idProducto, cantidad: 2 }] })));
    expect(solicitudes.map((r) => r.status).sort()).toEqual([201, 400]);
    const creada = solicitudes.find((r) => r.status === 201)!;
    intentos.push(creada.body.id as string);
    idsMp.push([...ordenes.keys()].at(-1)!);
    await request(app.getHttpServer()).post(`/pagos/mercado-pago/ordenes/${creada.body.id as string}/cancelar`)
      .auth(vendedor, { type: 'bearer' }).expect(201);
  });

  it('cancela remotamente una orden vencida antes de liberar su reserva', async () => {
    const respuesta = await request(app.getHttpServer()).post('/pagos/mercado-pago/ordenes')
      .auth(vendedor, { type: 'bearer' }).set('Idempotency-Key', randomUUID())
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
    const id = respuesta.body.id as string;
    const mpId = [...ordenes.keys()].at(-1)!;
    intentos.push(id); idsMp.push(mpId);
    await db.query("UPDATE pagos_qr SET vence_en=now()-interval '1 minute', actualizado_en=now()-interval '1 minute' WHERE id=$1", [id]);
    await pagos.conciliar();
    expect(clienteMp.cancelar).toHaveBeenCalledWith(mpId, `cancel-${id}`);
    const [pago] = await db.query<Array<{ estado: string; id_venta: number | null }>>('SELECT estado,id_venta FROM pagos_qr WHERE id=$1', [id]);
    const [producto] = await db.query<Array<{ stock_reservado: number }>>('SELECT stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(pago).toMatchObject({ estado: 'CANCELADO', id_venta: null });
    expect(producto.stock_reservado).toBe(0);
  });

  it('libera stock si Mercado Pago rechaza definitivamente la creación', async () => {
    clienteMp.crear.mockRejectedValueOnce(new MercadoPagoHttpError(401));
    const respuesta = await request(app.getHttpServer()).post('/pagos/mercado-pago/ordenes')
      .auth(vendedor, { type: 'bearer' }).set('Idempotency-Key', randomUUID())
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
    intentos.push(respuesta.body.id as string);
    expect(respuesta.body.estado).toBe('ERROR');
    const [producto] = await db.query<Array<{ stock_reservado: number }>>(
      'SELECT stock_reservado FROM productos WHERE id_producto=$1', [idProducto]);
    expect(producto.stock_reservado).toBe(0);
  });

  it('mantiene pendiente la orden ante un intento de pago rechazado y permite cancelarla', async () => {
    const respuesta = await request(app.getHttpServer()).post('/pagos/mercado-pago/ordenes')
      .auth(vendedor, { type: 'bearer' }).set('Idempotency-Key', randomUUID())
      .send({ idCliente, items: [{ idProducto, cantidad: 1 }] }).expect(201);
    const id = respuesta.body.id as string;
    const mpId = [...ordenes.keys()].at(-1)!;
    intentos.push(id); idsMp.push(mpId);
    // Orders API conserva la orden en created cuando se rechaza un intento de pago.
    await pagos.recibirWebhook(`evento-rechazado-${id}`, mpId);
    await pagos.conciliar();
    const [sinVenta] = await db.query<Array<{ id_venta: number | null; estado: string }>>(
      'SELECT id_venta,estado FROM pagos_qr WHERE id=$1', [id]);
    expect(sinVenta).toMatchObject({ id_venta: null, estado: 'PENDIENTE' });
    await request(app.getHttpServer()).post(`/pagos/mercado-pago/ordenes/${id}/cancelar`)
      .auth(vendedor, { type: 'bearer' }).expect(201);
  });

  it('agrupa por mes, factura y medio sin duplicar importes y filtra la categoría', async () => {
    const hoy = new Date();
    const anterior = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 15, 15));
    const actual = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 15, 15));
    const [usuario] = await db.query<Array<{ id_usuario: number }>>('SELECT id_usuario FROM usuarios WHERE nombre=$1',
      [process.env.SEED_ADMIN_USERNAME || 'admin']);
    for (const [indice, fecha, total, tipo, medio] of [
      [0, anterior, 1200, 'FACTURA_A', 'EFECTIVO'],
      [1, actual, 2400, 'FACTURA_B', 'TRANSFERENCIA'],
    ] as const) {
      const numero = `S5R${Date.now()}-${indice}`;
      const [venta] = await db.query<Array<{ id_venta: number }>>(`
        INSERT INTO ventas (numero_venta,fecha,subtotal,iva,total,modalidad_pago,estado,id_usuario,id_cliente)
        VALUES ($1,$2,$3,0,$3,'CONTADO','COMPLETADA',$4,$5) RETURNING id_venta`,
      [numero, fecha, total, usuario.id_usuario, idCliente]);
      ventasReporte.push(venta.id_venta);
      await db.query(`INSERT INTO facturas (id_venta,tipo_factura,numero_factura,subtotal,iva,total)
        VALUES ($1,$2,$3,$4,0,$4)`, [venta.id_venta, tipo, `F-${numero}`, total]);
      await db.query('INSERT INTO cobros (id_venta,metodo_cobro,monto) VALUES ($1,$2,$3)',
        [venta.id_venta, medio, total]);
      await db.query(`INSERT INTO detalles_venta (id_venta,id_producto,cantidad,precio_unitario,subtotal)
        VALUES ($1,$2,$3,1200,$4)`, [venta.id_venta, idProducto, indice + 1, total]);
    }
    const desde = anterior.toISOString().slice(0, 7) + '-01';
    const hasta = new Date(Date.UTC(actual.getUTCFullYear(), actual.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const resumen = await request(app.getHttpServer()).get('/reportes/ventas-mensuales')
      .auth(admin, { type: 'bearer' }).query({ desde, hasta }).expect(200);
    const datos = resumen.body.data as Array<{ mes: string; comprobantes: Record<string, number>; medios: Record<string, number> }>;
    expect(datos.find((m) => m.mes === anterior.toISOString().slice(0, 7))?.comprobantes.FACTURA_A).toBeGreaterThanOrEqual(1200);
    expect(datos.find((m) => m.mes === actual.toISOString().slice(0, 7))?.medios.TRANSFERENCIA).toBeGreaterThanOrEqual(2400);
    const [categoria] = await db.query<Array<{ id_categoria: number }>>('SELECT id_categoria FROM productos WHERE id_producto=$1', [idProducto]);
    const ranking = await request(app.getHttpServer()).get('/reportes/ranking-productos')
      .auth(admin, { type: 'bearer' }).query({ desde, hasta, idCategoria: categoria.id_categoria }).expect(200);
    expect((ranking.body.data as Array<{ idProducto: number }>).some((p) => p.idProducto === idProducto)).toBe(true);
  });
});
