import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Producto } from '../src/modules/productos/entities/producto.entity';

function crearIdentificadorFiscal(primerosDiez: string): string {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(primerosDiez[index]) * weight, 0);
  const remainder = 11 - (sum % 11);
  const digit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  return `${primerosDiez}${digit}`;
}

describe('Sprint 3 - ventas, cobros y cuenta corriente (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let producto: Producto;
  let stockInicial: number;
  let responsableId: number;
  let consumidorFinalId: number;
  let clienteResponsableId: number;
  let clienteConsumidorId: number;
  const ventasCreadas: number[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_VENTA_USERNAME || 'vendedor',
      contrasena: process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!',
    }).expect(200);
    token = login.body.accessToken as string;

    const condiciones = await request(app.getHttpServer())
      .get('/condiciones-iva')
      .auth(token, { type: 'bearer' })
      .expect(200);
    const lista = condiciones.body as Array<{ idCondicionIva: number; codigo: string }>;
    responsableId = lista.find((item) => item.codigo === 'RESPONSABLE_INSCRIPTO')!.idCondicionIva;
    consumidorFinalId = lista.find((item) => item.codigo === 'CONSUMIDOR_FINAL')!.idCondicionIva;

    producto = await dataSource.getRepository(Producto).findOneOrFail({
      where: { nombre: 'Pastillas de freno delanteras' },
    });
    stockInicial = producto.stock;

    const suffix = String(Date.now()).slice(-8);
    const responsable = await request(app.getHttpServer())
      .post('/clientes/persona')
      .auth(token, { type: 'bearer' })
      .send({
        nombre: 'Cliente',
        apellido: `Responsable${suffix}`,
        dni: suffix,
        cuil: crearIdentificadorFiscal(`20${suffix}`),
        condicionIvaId: responsableId,
        cuentaCorrienteHabilitada: true,
        limiteCredito: 500000,
      })
      .expect(201);
    clienteResponsableId = responsable.body.idCliente as number;

    const suffixConsumidor = String(Number(suffix) + 1).padStart(8, '0').slice(-8);
    const consumidor = await request(app.getHttpServer())
      .post('/clientes/persona')
      .auth(token, { type: 'bearer' })
      .send({
        nombre: 'Cliente',
        apellido: `Consumidor${suffix}`,
        dni: suffixConsumidor,
        cuil: crearIdentificadorFiscal(`27${suffixConsumidor}`),
        condicionIvaId: consumidorFinalId,
      })
      .expect(201);
    clienteConsumidorId = consumidor.body.idCliente as number;
  });

  afterAll(async () => {
    if (ventasCreadas.length) {
      await dataSource.query(`DELETE FROM "movimientos_cta_cte" WHERE "id_venta" = ANY($1)`, [ventasCreadas]);
      await dataSource.query(`DELETE FROM "movimientos_stock" WHERE "id_venta" = ANY($1)`, [ventasCreadas]);
      await dataSource.query(`DELETE FROM "ventas" WHERE "id_venta" = ANY($1)`, [ventasCreadas]);
    }
    if (producto) {
      await dataSource.getRepository(Producto).update(producto.idProducto, { stock: stockInicial });
    }
    for (const idCliente of [clienteResponsableId, clienteConsumidorId].filter(Boolean)) {
      const personas = await dataSource.query<Array<{ id_persona: number }>>(
        `DELETE FROM "clientes_persona" WHERE "id_cliente" = $1 RETURNING "id_persona"`,
        [idCliente],
      );
      await dataSource.query(`DELETE FROM "cuentas_corrientes" WHERE "id_cliente" = $1`, [idCliente]);
      await dataSource.query(`DELETE FROM "clientes" WHERE "id_cliente" = $1`, [idCliente]);
      if (personas[0]?.id_persona) {
        await dataSource.query(`DELETE FROM "personas" WHERE "id_persona" = $1`, [personas[0].id_persona]);
      }
    }
    await app.close();
  });

  it('revierte completamente una venta cuando el stock es insuficiente', async () => {
    await request(app.getHttpServer())
      .post('/ventas')
      .auth(token, { type: 'bearer' })
      .send({
        idCliente: clienteResponsableId,
        modalidadPago: 'CONTADO',
        metodoCobro: 'EFECTIVO',
        items: [{ idProducto: producto.idProducto, cantidad: stockInicial + 1 }],
      })
      .expect(400);

    const productoPersistido = await dataSource.getRepository(Producto).findOneByOrFail({
      idProducto: producto.idProducto,
    });
    expect(productoPersistido.stock).toBe(stockInicial);
  });

  it('registra contado con Kardex, Cobro y Factura A o B según IVA', async () => {
    const ventaA = await request(app.getHttpServer())
      .post('/ventas')
      .auth(token, { type: 'bearer' })
      .send({
        idCliente: clienteResponsableId,
        modalidadPago: 'CONTADO',
        metodoCobro: 'TRANSFERENCIA',
        referenciaPago: 'TEST-A',
        items: [{ idProducto: producto.idProducto, cantidad: 1 }],
      })
      .expect(201);
    ventasCreadas.push(ventaA.body.idVenta as number);
    expect(ventaA.body.factura.tipoFactura).toBe('FACTURA_A');
    expect(Number(ventaA.body.factura.iva)).toBeGreaterThan(0);
    expect(ventaA.body.cobro.metodoCobro).toBe('TRANSFERENCIA');

    const ventaB = await request(app.getHttpServer())
      .post('/ventas')
      .auth(token, { type: 'bearer' })
      .send({
        idCliente: clienteConsumidorId,
        modalidadPago: 'CONTADO',
        metodoCobro: 'EFECTIVO',
        items: [{ idProducto: producto.idProducto, cantidad: 1 }],
      })
      .expect(201);
    ventasCreadas.push(ventaB.body.idVenta as number);
    expect(ventaB.body.factura.tipoFactura).toBe('FACTURA_B');
    expect(Number(ventaB.body.factura.iva)).toBe(0);

    const movimientos = await dataSource.query<Array<{ cantidad: number }>>(
      `SELECT "cantidad" FROM "movimientos_stock" WHERE "id_venta" = ANY($1)`,
      [ventasCreadas],
    );
    expect(movimientos).toHaveLength(2);
  });

  it('imputa la venta a cuenta corriente sin Cobro y emite Remito', async () => {
    const venta = await request(app.getHttpServer())
      .post('/ventas')
      .auth(token, { type: 'bearer' })
      .send({
        idCliente: clienteResponsableId,
        modalidadPago: 'CUENTA_CORRIENTE',
        items: [{ idProducto: producto.idProducto, cantidad: 1 }],
      })
      .expect(201);
    ventasCreadas.push(venta.body.idVenta as number);

    expect(venta.body.cobro).toBeNull();
    expect(venta.body.factura.tipoFactura).toBe('REMITO');
    const cuenta = await dataSource.query<Array<{ saldo: string }>>(
      `SELECT "saldo" FROM "cuentas_corrientes" WHERE "id_cliente" = $1`,
      [clienteResponsableId],
    );
    expect(Number(cuenta[0]?.saldo)).toBe(Number(venta.body.total));
    const movimiento = await dataSource.query<Array<{ tipo: string }>>(
      `SELECT "tipo" FROM "movimientos_cta_cte" WHERE "id_venta" = $1`,
      [venta.body.idVenta],
    );
    expect(movimiento[0]?.tipo).toBe('IMPUTACION_VENTA');
  });

  it('permite la primera compra a una cuenta con saldo y límite en cero', async () => {
    await request(app.getHttpServer())
      .post('/cuentas-corrientes')
      .auth(token, { type: 'bearer' })
      .send({ clienteId: clienteConsumidorId })
      .expect(201);

    const venta = await request(app.getHttpServer())
      .post('/ventas')
      .auth(token, { type: 'bearer' })
      .send({
        idCliente: clienteConsumidorId,
        modalidadPago: 'CUENTA_CORRIENTE',
        items: [{ idProducto: producto.idProducto, cantidad: 1 }],
      })
      .expect(201);
    ventasCreadas.push(venta.body.idVenta as number);

    const cuenta = await dataSource.query<Array<{ saldo: string; limite_credito: string }>>(
      `SELECT "saldo", "limite_credito" FROM "cuentas_corrientes" WHERE "id_cliente" = $1`,
      [clienteConsumidorId],
    );
    expect(Number(cuenta[0]?.limite_credito)).toBe(0);
    expect(Number(cuenta[0]?.saldo)).toBe(Number(venta.body.total));
  });
});
