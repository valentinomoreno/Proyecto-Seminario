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

function validateSeedPassword(password: string): void {
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD debe incluir al menos una letra mayúscula.');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD debe incluir al menos una letra minúscula.');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD debe incluir al menos un número.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD debe incluir al menos un carácter especial.');
  }
}

async function seed(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('Defina SEED_ADMIN_USERNAME y SEED_ADMIN_PASSWORD antes de ejecutar el seed.');
  }

  validateSeedPassword(password);

  await AppDataSource.initialize();
  await AppDataSource.transaction(async (manager) => {
    const adminRol = await restoreOrCreate(manager, Rol, { nombre: NombreRol.ADMINISTRADOR }, {
      nombre: NombreRol.ADMINISTRADOR,
      descripcion: 'Acceso completo a la administración del sistema.',
    });
    await restoreOrCreate(manager, Rol, { nombre: NombreRol.EMPLEADO_VENTA }, {
      nombre: NombreRol.EMPLEADO_VENTA,
      descripcion: 'Acceso operativo al catálogo y las ventas.',
    });

    const persona = await restoreOrCreate(manager, Persona, { dni: '00000000' }, {
      nombre: 'Administrador',
      apellido: 'Sistema',
      dni: '00000000',
      cuil: '20000000001',
    });
    const empleado = await restoreOrCreate(manager, Empleado, { legajo: 'ADMIN-001' }, {
      legajo: 'ADMIN-001',
      activo: true,
      persona,
    });

    const usuarioRepository = manager.getRepository(Usuario);
    const existingUser = await usuarioRepository.findOne({ where: { nombre: username } });
    const usuario = existingUser ?? usuarioRepository.create();
    usuario.nombre = username.trim();
    usuario.contrasenaHash = await bcrypt.hash(password, 12);
    usuario.activo = true;
    usuario.rol = adminRol;
    usuario.empleado = empleado;
    await usuarioRepository.save(usuario);

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
  console.info('Seed inicial completado.');
}

seed().catch(async (error: unknown) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
