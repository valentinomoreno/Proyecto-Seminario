import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Sprint 4 – Fase 2: procesos programados de cuenta corriente (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let idCliente: number;
  let idCuentaCorriente: number;

  const SALDO_INICIAL = 100000;
  const SALDO_CON_MORA = 110000;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    process.env.MAIL_DRIVER = 'console';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_ADMIN_USERNAME || 'admin',
      contrasena: process.env.SEED_ADMIN_PASSWORD || 'Admin_Seguro.2026!',
    }).expect(200);
    adminToken = login.body.accessToken as string;

    const sufijo = Date.now().toString().slice(-8);
    const cliente = await request(app.getHttpServer())
      .post('/clientes')
      .auth(adminToken, { type: 'bearer' })
      .send({ nombre: 'Cliente', apellido: 'Mora', dniCuit: sufijo, email: `mora.${sufijo}@example.com` })
      .expect(201);
    idCliente = cliente.body.idCliente as number;

    // Dejamos la cuenta con el saldo impago exacto del criterio de aceptación del sprint.
    const cuentas = await dataSource.query<Array<{ id_cuenta_corriente: number }>>(
      'UPDATE cuentas_corrientes SET saldo = $1 WHERE id_cliente = $2 RETURNING id_cuenta_corriente',
      [SALDO_INICIAL, idCliente],
    );
    idCuentaCorriente = cuentas[0].id_cuenta_corriente;
  });

  afterAll(async () => {
    if (idCliente) {
      await dataSource.query('DELETE FROM avisos_cobro_enviados WHERE id_cliente = $1', [idCliente]);
      await dataSource.query('DELETE FROM movimientos_cta_cte WHERE id_cuenta_corriente = $1', [idCuentaCorriente]);
      await dataSource.query('DELETE FROM cuentas_corrientes WHERE id_cliente = $1', [idCliente]);
      await dataSource.query('DELETE FROM clientes WHERE id_cliente = $1', [idCliente]);
    }
    await app.close();
  });

  it('aplica el 10% de mora sobre un saldo impago de $100.000 dejándolo en $110.000 con su MovimientoCtaCte', async () => {
    await request(app.getHttpServer())
      .post('/notificaciones/mora/ejecutar-ahora')
      .auth(adminToken, { type: 'bearer' })
      .expect(201);

    const cuenta = await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Number(cuenta.body.saldo)).toBe(SALDO_CON_MORA);

    const movimientos = cuenta.body.movimientos as Array<{ tipo: string; monto: number; saldoResultante: number }>;
    const mora = movimientos.find((m) => m.tipo === 'MORA');
    expect(mora).toBeDefined();
    expect(Number(mora?.monto)).toBe(10000);
    expect(Number(mora?.saldoResultante)).toBe(SALDO_CON_MORA);
  });

  it('no vuelve a aplicar la mora si ya se aplicó en el mes corriente (idempotencia)', async () => {
    await request(app.getHttpServer())
      .post('/notificaciones/mora/ejecutar-ahora')
      .auth(adminToken, { type: 'bearer' })
      .expect(201);

    const cuenta = await request(app.getHttpServer())
      .get(`/cuentas-corrientes/${idCliente}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(Number(cuenta.body.saldo)).toBe(SALDO_CON_MORA);

    const movimientos = cuenta.body.movimientos as Array<{ tipo: string }>;
    expect(movimientos.filter((m) => m.tipo === 'MORA')).toHaveLength(1);
  });

  it('envía el aviso de cobro una sola vez por día al cliente con deuda', async () => {
    const primera = await request(app.getHttpServer())
      .post('/notificaciones/avisos-cobro/ejecutar-ahora')
      .auth(adminToken, { type: 'bearer' })
      .expect(201);
    expect(primera.body.enviados).toBeGreaterThanOrEqual(1);

    const segunda = await request(app.getHttpServer())
      .post('/notificaciones/avisos-cobro/ejecutar-ahora')
      .auth(adminToken, { type: 'bearer' })
      .expect(201);
    expect(segunda.body.enviados).toBe(0);
    expect(segunda.body.omitidos).toBeGreaterThanOrEqual(1);
  });

  it('impide que un empleado de ventas dispare los procesos programados', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_VENTA_USERNAME || 'vendedor',
      contrasena: process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!',
    }).expect(200);

    await request(app.getHttpServer())
      .post('/notificaciones/mora/ejecutar-ahora')
      .auth(login.body.accessToken as string, { type: 'bearer' })
      .expect(403);
  });
});
