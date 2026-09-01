import * as bcrypt from 'bcrypt';
import { DeepPartial, EntityManager, ObjectLiteral } from 'typeorm';
import { NombreRol } from '../common/enums/nombre-rol.enum';
import { Categoria } from '../modules/productos/entities/categoria.entity';
import { Deposito } from '../modules/productos/entities/deposito.entity';
import { Estante } from '../modules/productos/entities/estante.entity';
import { Marca } from '../modules/productos/entities/marca.entity';
import { Sector } from '../modules/productos/entities/sector.entity';
import { Empleado } from '../modules/usuarios/entities/empleado.entity';
import { Persona } from '../modules/usuarios/entities/persona.entity';
import { Rol } from '../modules/usuarios/entities/rol.entity';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import AppDataSource from './data-source';

async function restoreOrCreate<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: new () => T,
  where: Partial<T>,
  values: DeepPartial<T>,
): Promise<T> {
  const repository = manager.getRepository(entity);
  let record = await repository.findOne({ where, withDeleted: true });
  if (!record) record = repository.create(values);
  else Object.assign(record, values, { fechaBaja: null });
  return repository.save(record);
}

function validateSeedPassword(password: string, envVarName: string): void {
  if (password.length < 8) {
    throw new Error(`${envVarName} debe tener al menos 8 caracteres.`);
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error(`${envVarName} debe incluir al menos una letra mayúscula.`);
  }
  if (!/[a-z]/.test(password)) {
    throw new Error(`${envVarName} debe incluir al menos una letra minúscula.`);
  }
  if (!/[0-9]/.test(password)) {
    throw new Error(`${envVarName} debe incluir al menos un número.`);
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error(`${envVarName} debe incluir al menos un carácter especial.`);
  }
}

async function seed(): Promise<void> {
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin_Seguro.2026!';
  const ventaUsername = process.env.SEED_VENTA_USERNAME || 'vendedor';
  const ventaPassword = process.env.SEED_VENTA_PASSWORD || 'Vendedor_Seguro.2026!';

  validateSeedPassword(adminPassword, 'SEED_ADMIN_PASSWORD');
  validateSeedPassword(ventaPassword, 'SEED_VENTA_PASSWORD');

  await AppDataSource.initialize();
  await AppDataSource.transaction(async (manager) => {
    await manager.query('CREATE SEQUENCE IF NOT EXISTS "producto_codigo_seq" START WITH 1 INCREMENT BY 1');

    const adminRol = await restoreOrCreate(manager, Rol, { nombre: NombreRol.ADMINISTRADOR }, {
      nombre: NombreRol.ADMINISTRADOR,
      descripcion: 'Acceso completo a la administración del sistema.',
    });
    const ventaRol = await restoreOrCreate(manager, Rol, { nombre: NombreRol.EMPLEADO_VENTA }, {
      nombre: NombreRol.EMPLEADO_VENTA,
      descripcion: 'Acceso operativo al catálogo y las ventas.',
    });

    // 1. Usuario Administrador
    const personaAdmin = await restoreOrCreate(manager, Persona, { dni: '00000000' }, {
      nombre: 'Administrador',
      apellido: 'Sistema',
      dni: '00000000',
      cuil: '20000000001',
    });
    const empleadoAdmin = await restoreOrCreate(manager, Empleado, { legajo: 'ADMIN-001' }, {
      legajo: 'ADMIN-001',
      activo: true,
      persona: personaAdmin,
    });

    const usuarioRepository = manager.getRepository(Usuario);
    const existingAdmin = await usuarioRepository.findOne({ where: { nombre: adminUsername } });
    const usuarioAdmin = existingAdmin ?? usuarioRepository.create();
    usuarioAdmin.nombre = adminUsername.trim();
    usuarioAdmin.contrasenaHash = await bcrypt.hash(adminPassword, 12);
    usuarioAdmin.activo = true;
    usuarioAdmin.rol = adminRol;
    usuarioAdmin.empleado = empleadoAdmin;
    await usuarioRepository.save(usuarioAdmin);

    // 2. Usuario Vendedor (EMPLEADO_VENTA)
    const personaVenta = await restoreOrCreate(manager, Persona, { dni: '00000002' }, {
      nombre: 'Vendedor',
      apellido: 'Mostrador',
      dni: '00000002',
      cuil: '20000000002',
    });
    const empleadoVenta = await restoreOrCreate(manager, Empleado, { legajo: 'VENTA-001' }, {
      legajo: 'VENTA-001',
      activo: true,
      persona: personaVenta,
    });

    const existingVenta = await usuarioRepository.findOne({ where: { nombre: ventaUsername } });
    const usuarioVenta = existingVenta ?? usuarioRepository.create();
    usuarioVenta.nombre = ventaUsername.trim();
    usuarioVenta.contrasenaHash = await bcrypt.hash(ventaPassword, 12);
    usuarioVenta.activo = true;
    usuarioVenta.rol = ventaRol;
    usuarioVenta.empleado = empleadoVenta;
    await usuarioRepository.save(usuarioVenta);

    // 3. Catálogo base
    for (const categoria of [
      { nombre: 'Motor', descripcion: 'Repuestos y componentes del motor.' },
      { nombre: 'Frenos', descripcion: 'Componentes del sistema de frenado.' },
      { nombre: 'Electricidad', descripcion: 'Componentes eléctricos y electrónicos.' },
    ]) {
      await restoreOrCreate(manager, Categoria, { nombre: categoria.nombre }, categoria);
    }
    for (const nombre of ['Bosch', 'NGK', 'Corven']) {
      await restoreOrCreate(manager, Marca, { nombre }, { nombre });
    }

    const deposito = await restoreOrCreate(manager, Deposito, { nombre: 'Depósito Principal' }, {
      nombre: 'Depósito Principal',
      direccion: 'Local central',
    });
    for (const nombreSector of ['A', 'B']) {
      const sector = await restoreOrCreate(manager, Sector, { nombre: nombreSector, deposito: { idDeposito: deposito.idDeposito } } as Partial<Sector>, {
        nombre: nombreSector,
        deposito,
      });
      for (const numero of ['01', '02']) {
        const codigo = `${nombreSector}-${numero}`;
        await restoreOrCreate(manager, Estante, { codigo, sector: { idSector: sector.idSector } } as Partial<Estante>, {
          codigo,
          descripcion: `Estante ${codigo}`,
          sector,
        });
      }
    }
  });
  await AppDataSource.destroy();
  console.info('Seed inicial completado con usuarios Administrador y Vendedor.');
}

seed().catch(async (error: unknown) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
