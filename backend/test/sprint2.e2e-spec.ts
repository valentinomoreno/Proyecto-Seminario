import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClienteEmpresa } from '../src/modules/clientes/entities/cliente-empresa.entity';
import { ClientePersona } from '../src/modules/clientes/entities/cliente-persona.entity';
import { Cliente } from '../src/modules/clientes/entities/cliente.entity';
import { CuentaCorriente } from '../src/modules/cuentas-corrientes/entities/cuenta-corriente.entity';

function crearIdentificadorFiscal(primerosDiez: string): string {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(primerosDiez[index]) * weight, 0);
  const remainder = 11 - (sum % 11);
  const digit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  return `${primerosDiez}${digit}`;
}

describe('Sprint 2 (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const clientIds: number[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    for (const idCliente of clientIds) {
      await dataSource.getRepository(CuentaCorriente)
        .createQueryBuilder()
        .delete()
        .where('"id_cliente" = :idCliente', { idCliente })
        .execute();
      await dataSource.getRepository(ClientePersona).delete({ cliente: { idCliente } });
      await dataSource.getRepository(ClienteEmpresa).delete({ cliente: { idCliente } });
      await dataSource.getRepository(Cliente).delete(idCliente);
    }
    await app.close();
  });

  it('cubre clientes, cuentas corrientes, validaciones y permisos', async () => {
    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_ADMIN_USERNAME || 'admin',
      contrasena: process.env.SEED_ADMIN_PASSWORD || 'Admin_Seguro.2026!',
    }).expect(200);
    const employeeLogin = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_VENTA_USERNAME || 'vendedor',
      contrasena: process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!',
    }).expect(200);
    const adminToken = adminLogin.body.accessToken as string;
    const employeeToken = employeeLogin.body.accessToken as string;

    const condiciones = await request(app.getHttpServer())
      .get('/condiciones-iva')
      .auth(employeeToken, { type: 'bearer' })
      .expect(200);
    const condicionesBody = condiciones.body as Array<{ idCondicionIva: number; codigo: string }>;
    expect(condicionesBody).toHaveLength(3);
    const consumidorFinalId = condicionesBody.find((item) => item.codigo === 'CONSUMIDOR_FINAL')?.idCondicionIva;
    const responsableId = condicionesBody.find((item) => item.codigo === 'RESPONSABLE_INSCRIPTO')?.idCondicionIva;
    expect(consumidorFinalId).toBeDefined();
    expect(responsableId).toBeDefined();

    const uniqueBody = String(Date.now()).slice(-8);
    const dni = uniqueBody;
    const cuil = crearIdentificadorFiscal(`20${uniqueBody}`);
    const cuilAlternativo = crearIdentificadorFiscal(`27${uniqueBody}`);
    const cuit = crearIdentificadorFiscal(`30${String(Number(uniqueBody) + 1).padStart(8, '0').slice(-8)}`);

    await request(app.getHttpServer()).post('/clientes/persona').auth(employeeToken, { type: 'bearer' }).send({
      nombre: 'Ana',
      apellido: `Sprint${uniqueBody}`,
      dni,
      cuil: `${cuil.slice(0, 2)}-${cuil.slice(2, 10)}-${cuil.slice(10)}`,
      condicionIvaId: consumidorFinalId,
      correo: 'ana@example.com',
    }).expect(201).expect(({ body }) => {
      clientIds.push(body.idCliente as number);
      expect(body.persona).toMatchObject({ dni, cuil });
      expect(body.estadoCuenta).toBe('SIN_CUENTA');
    });
    const personaId = clientIds[0];

    await request(app.getHttpServer()).post('/clientes/empresa').auth(adminToken, { type: 'bearer' }).send({
      cuit,
      razonSocial: `Autopartes ${uniqueBody} SRL`,
      personaContacto: 'Carlos Prueba',
      condicionIvaId: responsableId,
      telefono: '3515550101',
    }).expect(201).expect(({ body }) => {
      clientIds.push(body.idCliente as number);
      expect(body.empresa.cuit).toBe(cuit);
      expect(body.tipo).toBe('EMPRESA');
    });

    await request(app.getHttpServer()).post('/clientes/persona').auth(employeeToken, { type: 'bearer' }).send({
      nombre: 'Inválido', apellido: 'Documento', dni: '123', cuil: '20-12345678-0', condicionIvaId: consumidorFinalId,
    }).expect(400);
    await request(app.getHttpServer()).post('/clientes/persona').auth(employeeToken, { type: 'bearer' }).send({
      nombre: 'Duplicado', apellido: 'Documento', dni, cuil: cuilAlternativo, condicionIvaId: consumidorFinalId,
    }).expect(409).expect(({ body }) => expect(body.message).toBe('Ya existe un cliente con ese DNI.'));
    await request(app.getHttpServer()).post('/clientes/empresa').auth(employeeToken, { type: 'bearer' }).send({
      cuit,
      razonSocial: 'Empresa duplicada',
      personaContacto: 'Contacto Duplicado',
      condicionIvaId: responsableId,
    }).expect(409).expect(({ body }) => expect(body.message).toBe('Ya existe un cliente con ese CUIT.'));
    await request(app.getHttpServer()).post('/clientes/empresa').auth(employeeToken, { type: 'bearer' }).send({
      cuit,
      razonSocial: 'Empresa sin condición fiscal',
      personaContacto: 'Contacto de prueba',
    }).expect(400);

    await request(app.getHttpServer()).get('/clientes').auth(employeeToken, { type: 'bearer' })
      .query({ buscar: `Sprint${uniqueBody}` }).expect(200)
      .expect(({ body }) => expect((body.data as Array<{ idCliente: number }>).some((cliente) => cliente.idCliente === personaId)).toBe(true));
    await request(app.getHttpServer()).get('/clientes').auth(employeeToken, { type: 'bearer' })
      .query({ buscar: dni }).expect(200)
      .expect(({ body }) => expect((body.data as Array<{ idCliente: number }>).some((cliente) => cliente.idCliente === personaId)).toBe(true));
    await request(app.getHttpServer()).get('/clientes').auth(employeeToken, { type: 'bearer' })
      .query({ buscar: cuit }).expect(200)
      .expect(({ body }) => expect((body.data as Array<{ idCliente: number }>).some((cliente) => cliente.idCliente === clientIds[1])).toBe(true));
    await request(app.getHttpServer()).get('/clientes').auth(employeeToken, { type: 'bearer' })
      .query({ buscar: `Autopartes ${uniqueBody}` }).expect(200)
      .expect(({ body }) => expect((body.data as Array<{ idCliente: number }>).some((cliente) => cliente.idCliente === clientIds[1])).toBe(true));

    await request(app.getHttpServer()).put(`/clientes/${personaId}`).auth(employeeToken, { type: 'bearer' })
      .send({ telefono: '3515559999', direccion: 'Dirección actualizada' }).expect(200)
      .expect(({ body }) => expect(body.contacto.telefono).toBe('3515559999'));
    await request(app.getHttpServer()).get(`/clientes/${personaId}`).auth(employeeToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => expect(body.contacto).toMatchObject({
        telefono: '3515559999',
        direccion: 'Dirección actualizada',
      }));
    const persistedPersona = await dataSource.getRepository(ClientePersona).findOne({
      where: { cliente: { idCliente: personaId } },
      relations: { personaRegistro: true },
    });
    expect(persistedPersona?.personaRegistro).toMatchObject({ dni, cuil });
    await request(app.getHttpServer()).put(`/clientes/${personaId}`).auth(employeeToken, { type: 'bearer' })
      .send({ condicionIvaId: responsableId }).expect(400);
    await request(app.getHttpServer()).delete(`/clientes/${personaId}`).auth(employeeToken, { type: 'bearer' }).expect(403);

    const createdAccount = await request(app.getHttpServer()).post('/cuentas-corrientes')
      .auth(employeeToken, { type: 'bearer' }).send({ clienteId: personaId }).expect(201);
    const accountId = createdAccount.body.idCuentaCorriente as number;
    const accountNumber = createdAccount.body.numeroCuenta as string;
    expect(accountNumber).toMatch(/^CC-\d{6}$/);
    expect(createdAccount.body.saldo).toBe(0);

    const companyAccount = await request(app.getHttpServer()).post('/cuentas-corrientes')
      .auth(adminToken, { type: 'bearer' }).send({ clienteId: clientIds[1] }).expect(201);
    const companyAccountId = companyAccount.body.idCuentaCorriente as number;
    expect(companyAccount.body.numeroCuenta).not.toBe(accountNumber);
    await request(app.getHttpServer()).get('/cuentas-corrientes')
      .auth(employeeToken, { type: 'bearer' }).expect(200)
      .expect(({ body }) => expect((body.data as Array<{ idCuentaCorriente: number; saldo: number }>).some((cuenta) => cuenta.idCuentaCorriente === accountId && cuenta.saldo === 0)).toBe(true));
    await request(app.getHttpServer()).delete(`/cuentas-corrientes/${companyAccountId}`)
      .auth(adminToken, { type: 'bearer' }).expect(204);

    await request(app.getHttpServer()).post('/cuentas-corrientes')
      .auth(employeeToken, { type: 'bearer' }).send({ clienteId: personaId }).expect(409);
    await request(app.getHttpServer()).delete(`/cuentas-corrientes/${accountId}`)
      .auth(employeeToken, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).delete(`/clientes/${personaId}`)
      .auth(adminToken, { type: 'bearer' }).expect(409);

    await dataSource.getRepository(CuentaCorriente).update(accountId, { saldo: 100 });
    await request(app.getHttpServer()).delete(`/cuentas-corrientes/${accountId}`)
      .auth(adminToken, { type: 'bearer' }).expect(409);
    await dataSource.getRepository(CuentaCorriente).update(accountId, { saldo: 0 });
    await request(app.getHttpServer()).delete(`/cuentas-corrientes/${accountId}`)
      .auth(adminToken, { type: 'bearer' }).expect(204);

    await request(app.getHttpServer()).post('/cuentas-corrientes')
      .auth(employeeToken, { type: 'bearer' }).send({ clienteId: personaId }).expect(201)
      .expect(({ body }) => {
        expect(body.numeroCuenta).toBe(accountNumber);
        expect(body.saldo).toBe(0);
      });

    await request(app.getHttpServer()).delete(`/cuentas-corrientes/${accountId}`)
      .auth(adminToken, { type: 'bearer' }).expect(204);
    await request(app.getHttpServer()).delete(`/clientes/${personaId}`)
      .auth(adminToken, { type: 'bearer' }).expect(204);
    await request(app.getHttpServer()).delete(`/clientes/${clientIds[1]}`)
      .auth(adminToken, { type: 'bearer' }).expect(204);
  });
});
