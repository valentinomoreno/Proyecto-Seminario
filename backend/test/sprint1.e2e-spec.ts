import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { NombreRol } from '../src/common/enums/nombre-rol.enum';
import { Producto } from '../src/modules/productos/entities/producto.entity';
import { Empleado } from '../src/modules/usuarios/entities/empleado.entity';
import { Persona } from '../src/modules/usuarios/entities/persona.entity';
import { Rol } from '../src/modules/usuarios/entities/rol.entity';
import { Usuario } from '../src/modules/usuarios/entities/usuario.entity';

describe('Sprint 1 (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let employeeUsername: string;
  let sku: string;
  let testIds: { usuario?: number; empleado?: number; persona?: number; producto?: number } = {};

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);

    const suffix = Date.now().toString();
    employeeUsername = `empleado_${suffix}`;
    sku = `E2E-${suffix}`;
    const rol = await dataSource.getRepository(Rol).findOneByOrFail({ nombre: NombreRol.EMPLEADO_VENTA });
    const persona = await dataSource.getRepository(Persona).save({ nombre: 'Empleado', apellido: 'Prueba', dni: suffix.slice(-8), cuil: `20${suffix.slice(-8)}1` });
    const empleado = await dataSource.getRepository(Empleado).save({ legajo: `TEST-${suffix}`, activo: true, persona });
    const usuario = await dataSource.getRepository(Usuario).save({ nombre: employeeUsername, contrasenaHash: await bcrypt.hash('Empleado123!', 4), activo: true, rol, empleado });
    testIds = { usuario: usuario.idUsuario, empleado: empleado.idEmpleado, persona: persona.idPersona };
  });

  afterAll(async () => {
    if (testIds.producto) await dataSource.getRepository(Producto).delete(testIds.producto);
    if (testIds.usuario) await dataSource.getRepository(Usuario).delete(testIds.usuario);
    if (testIds.empleado) await dataSource.getRepository(Empleado).delete(testIds.empleado);
    if (testIds.persona) await dataSource.getRepository(Persona).delete(testIds.persona);
    await app.close();
  });

  it('aplica autenticación, roles y CRUD de productos', async () => {
    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      nombre: process.env.SEED_ADMIN_USERNAME,
      contrasena: process.env.SEED_ADMIN_PASSWORD,
    }).expect(200);
    const employeeLogin = await request(app.getHttpServer()).post('/auth/login').send({ nombre: employeeUsername, contrasena: 'Empleado123!' }).expect(200);
    const adminToken = adminLogin.body.accessToken as string;
    const employeeToken = employeeLogin.body.accessToken as string;

    const [categorias, marcas, estantes] = await Promise.all([
      request(app.getHttpServer()).get('/categorias').auth(adminToken, { type: 'bearer' }).expect(200),
      request(app.getHttpServer()).get('/marcas').auth(adminToken, { type: 'bearer' }).expect(200),
      request(app.getHttpServer()).get('/estantes').auth(adminToken, { type: 'bearer' }).expect(200),
    ]);
    const payload = {
      sku, nombre: 'Producto E2E', descripcion: 'Prueba integrada', stock: 3,
      precioUnitario: 2000, costo: 1200,
      categoriaId: categorias.body[0].idCategoria,
      marcaId: marcas.body[0].idMarca,
      estanteId: estantes.body[0].idEstante,
    };
    const created = await request(app.getHttpServer()).post('/productos').auth(adminToken, { type: 'bearer' }).send(payload).expect(201);
    testIds.producto = created.body.idProducto as number;

    await request(app.getHttpServer()).get('/productos').auth(employeeToken, { type: 'bearer' }).query({ buscar: sku }).expect(200).expect(({ body }) => {
      expect(body.data).toHaveLength(1);
      expect(body.data[0].ubicacion.estante.codigo).toBeTruthy();
    });
    await request(app.getHttpServer()).post('/productos').auth(employeeToken, { type: 'bearer' }).send(payload).expect(403);
    await request(app.getHttpServer()).put(`/productos/${testIds.producto}`).auth(adminToken, { type: 'bearer' }).send({ stock: -1 }).expect(400);
    await request(app.getHttpServer()).delete(`/productos/${testIds.producto}`).auth(adminToken, { type: 'bearer' }).expect(204);
    await request(app.getHttpServer()).get(`/productos/${testIds.producto}`).auth(adminToken, { type: 'bearer' }).expect(404);
  });
});
