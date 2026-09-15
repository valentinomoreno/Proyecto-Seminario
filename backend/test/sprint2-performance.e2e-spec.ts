import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { performance } from 'node:perf_hooks';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Sprint 2 - rendimiento de búsqueda (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let employeeToken: string;
  let searchCases: Array<[string, string]>;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);

    const employeeLogin = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_VENTA_USERNAME || 'vendedor',
      contrasena: process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!',
    }).expect(200);
    employeeToken = employeeLogin.body.accessToken as string;

    await dataSource.query(`
      WITH clientes_creados AS (
        INSERT INTO clientes (tipo, telefono, id_condicion_iva)
        SELECT 'PERSONA'::clientes_tipo_enum, 'PERF_SPRINT_2', ci.id_condicion_iva
        FROM generate_series(1, 5000)
        CROSS JOIN LATERAL (
          SELECT id_condicion_iva FROM condiciones_iva WHERE codigo = 'CONSUMIDOR_FINAL' LIMIT 1
        ) ci
        RETURNING id_cliente
      ), personas_creadas AS (
        INSERT INTO personas (nombre, apellido, dni, cuil)
        SELECT
          'Nombre rendimiento',
          'PerfApellido ' || id_cliente,
          lpad((50000000 + id_cliente)::text, 8, '0'),
          (50000000000 + id_cliente)::text
        FROM clientes_creados
        RETURNING id_persona, dni, cuil
      )
      INSERT INTO clientes_persona (nombre, apellido, dni, cuil, id_cliente, id_persona)
      SELECT
        'Nombre rendimiento',
        'PerfApellido ' || c.id_cliente,
        p.dni,
        p.cuil,
        c.id_cliente,
        p.id_persona
      FROM clientes_creados c
      JOIN personas_creadas p ON p.dni = lpad((50000000 + c.id_cliente)::text, 8, '0')
    `);

    await dataSource.query(`
      WITH clientes_creados AS (
        INSERT INTO clientes (tipo, telefono, id_condicion_iva)
        SELECT 'EMPRESA'::clientes_tipo_enum, 'PERF_SPRINT_2', ci.id_condicion_iva
        FROM generate_series(1, 5000)
        CROSS JOIN LATERAL (
          SELECT id_condicion_iva FROM condiciones_iva WHERE codigo = 'RESPONSABLE_INSCRIPTO' LIMIT 1
        ) ci
        RETURNING id_cliente
      )
      INSERT INTO clientes_empresa (cuit, razon_social, persona_contacto, id_cliente)
      SELECT
        (60000000000 + id_cliente)::text,
        'Perf Empresa ' || id_cliente,
        'Contacto rendimiento',
        id_cliente
      FROM clientes_creados
    `);
    await dataSource.query('ANALYZE clientes');
    await dataSource.query('ANALYZE clientes_persona');
    await dataSource.query('ANALYZE clientes_empresa');
    const [sample] = await dataSource.query<Array<{
      dni: string;
      apellido: string;
      cuit: string;
      razonSocial: string;
    }>>(`
      SELECT cp.dni, cp.apellido, ce.cuit, ce.razon_social AS "razonSocial"
      FROM clientes_persona cp
      CROSS JOIN clientes_empresa ce
      JOIN clientes empresa_cliente ON empresa_cliente.id_cliente = ce.id_cliente
      WHERE cp.apellido LIKE 'PerfApellido %' AND empresa_cliente.telefono = 'PERF_SPRINT_2'
      LIMIT 1
    `);
    if (!sample) throw new Error('No se pudo obtener la muestra para la prueba de rendimiento.');
    searchCases = [
      ['DNI', sample.dni],
      ['CUIT', sample.cuit],
      ['apellido', sample.apellido],
      ['razón social', sample.razonSocial],
    ];
  }, 30_000);

  afterAll(async () => {
    await dataSource.query(`
      WITH personas_vinculadas AS (
        DELETE FROM clientes_persona cp
        USING clientes c
        WHERE cp.id_cliente = c.id_cliente AND c.telefono = 'PERF_SPRINT_2'
        RETURNING cp.id_persona
      )
      DELETE FROM personas p
      USING personas_vinculadas pv
      WHERE p.id_persona = pv.id_persona
    `);
    await dataSource.query(`
      DELETE FROM clientes_empresa ce
      USING clientes c
      WHERE ce.id_cliente = c.id_cliente AND c.telefono = 'PERF_SPRINT_2'
    `);
    await dataSource.query(`DELETE FROM clientes WHERE telefono = 'PERF_SPRINT_2'`);
    await app.close();
  }, 30_000);

  it('responde las búsquedas principales en menos de 2 segundos', async () => {
    for (const [, buscar] of searchCases) {
      const inicio = performance.now();
      const response = await request(app.getHttpServer())
        .get('/clientes')
        .auth(employeeToken, { type: 'bearer' })
        .query({ buscar, limit: 10 })
        .expect(200);
      const duracionMs = performance.now() - inicio;

      expect(response.body.data).not.toHaveLength(0);
      expect(duracionMs).toBeLessThan(2_000);
    }
  });
});
