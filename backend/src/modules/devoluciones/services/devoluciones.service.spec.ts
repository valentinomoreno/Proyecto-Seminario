import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCte } from '../../cuentas-corrientes/entities/movimiento-cta-cte.entity';
import { TipoMovimientoCtaCte } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-cte.enum';
import { MovimientoStock } from '../../productos/entities/movimiento-stock.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { TipoMovimientoStock } from '../../productos/enums/tipo-movimiento-stock.enum';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { VentaDetalle } from '../../ventas/entities/venta-detalle.entity';
import { Devolucion } from '../entities/devolucion.entity';
import { NotaCredito } from '../entities/nota-credito.entity';
import { DEVOLUCIONES_REPOSITORY, IDevolucionesRepository } from '../repositories/interfaces/devoluciones-repository.interface';
import { DevolucionesService } from './devoluciones.service';

type RepoMock = {
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function crearRepoMock(): RepoMock {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  };
}

function hace(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

const VENDEDOR: UsuarioAutenticado = {
  idUsuario: 2,
  nombre: 'vendedor',
  rol: NombreRol.EMPLEADO_VENTA,
  idEmpleado: 9,
};

const DTO_BASE = { idVentaDetalle: 1, cantidad: 2, motivo: 'Producto defectuoso', aptoReingreso: true };

describe('DevolucionesService', () => {
  let service: DevolucionesService;
  let repos: Map<unknown, RepoMock>;
  let queryBuilder: { setLock: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let mockDevolucionesRepo: jest.Mocked<IDevolucionesRepository>;

  beforeEach(async () => {
    repos = new Map<unknown, RepoMock>([
      [Empleado, crearRepoMock()],
      [VentaDetalle, crearRepoMock()],
      [Producto, crearRepoMock()],
      [MovimientoStock, crearRepoMock()],
      [Devolucion, crearRepoMock()],
      [NotaCredito, crearRepoMock()],
      [CuentaCorriente, crearRepoMock()],
      [MovimientoCtaCte, crearRepoMock()],
    ]);

    repos.get(Devolucion)!.save.mockImplementation((entity: Record<string, unknown>) =>
      Promise.resolve({ ...entity, idDevolucion: 99 }),
    );

    queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => repos.get(entity)),
      createQueryBuilder: jest.fn(() => queryBuilder),
      query: jest.fn().mockResolvedValue([{ nextval: '7' }]),
    } as unknown as EntityManager;

    mockDevolucionesRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn().mockResolvedValue({ idDevolucion: 99, ventaDetalle: null }),
    };

    const dataSource = {
      transaction: jest.fn((work: (m: EntityManager) => Promise<unknown>) => work(manager)),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevolucionesService,
        { provide: DEVOLUCIONES_REPOSITORY, useValue: mockDevolucionesRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DevolucionesService>(DevolucionesService);
  });

  function prepararVenta(opciones: { diasDesdeVenta: number; cantidad?: number; cantidadDevuelta?: number }) {
    repos.get(Empleado)!.findOneBy.mockResolvedValue({ idEmpleado: 9, legajo: 'VENTA-001' });
    repos.get(VentaDetalle)!.findOne.mockResolvedValue({
      idVentaDetalle: 1,
      cantidad: opciones.cantidad ?? 5,
      cantidadDevuelta: opciones.cantidadDevuelta ?? 0,
      precioUnitario: 1000,
      producto: { idProducto: 10, nombre: 'Pastilla de freno' },
      venta: { idVenta: 3, numeroComprobante: 'V-00003', fecha: hace(opciones.diasDesdeVenta), cliente: { idCliente: 4 } },
    });
    repos.get(Producto)!.findOne.mockResolvedValue({ idProducto: 10, nombre: 'Pastilla de freno', stock: 12 });
    queryBuilder.getOne.mockResolvedValue({ idCuentaCorriente: 2, saldo: 5000, fechaUltimoMovimiento: null });
  }

  it('rechaza la devolución si el usuario no tiene empleado asociado (RNF-05)', async () => {
    const sinEmpleado: UsuarioAutenticado = { ...VENDEDOR, idEmpleado: null };

    await expect(service.create(DTO_BASE, sinEmpleado)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza la devolución cuando pasaron más de 15 días desde la venta (RNF-10)', async () => {
    prepararVenta({ diasDesdeVenta: 16 });

    await expect(service.create(DTO_BASE, VENDEDOR)).rejects.toThrow(/plazo de 15 días/i);
    expect(repos.get(Devolucion)!.save).not.toHaveBeenCalled();
  });

  it('acepta la devolución en el día 15 exacto (límite inclusive)', async () => {
    prepararVenta({ diasDesdeVenta: 15 });

    await expect(service.create(DTO_BASE, VENDEDOR)).resolves.toBeDefined();
    expect(repos.get(Devolucion)!.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza devolver más unidades de las disponibles del ítem', async () => {
    prepararVenta({ diasDesdeVenta: 2, cantidad: 5, cantidadDevuelta: 4 });

    await expect(service.create({ ...DTO_BASE, cantidad: 2 }, VENDEDOR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reingresa el stock y deja el movimiento de kardex cuando el producto es apto para reventa', async () => {
    prepararVenta({ diasDesdeVenta: 3 });

    await service.create({ ...DTO_BASE, cantidad: 2, aptoReingreso: true }, VENDEDOR);

    const productoGuardado = repos.get(Producto)!.save.mock.calls[0][0] as { stock: number };
    expect(productoGuardado.stock).toBe(14);

    const movimiento = repos.get(MovimientoStock)!.create.mock.calls[0][0] as {
      tipo: TipoMovimientoStock;
      cantidad: number;
      stockResultante: number;
      idDevolucion: number;
    };
    expect(movimiento.tipo).toBe(TipoMovimientoStock.DEVOLUCION);
    expect(movimiento.cantidad).toBe(2);
    expect(movimiento.stockResultante).toBe(14);
    expect(movimiento.idDevolucion).toBe(99);
  });

  it('no toca el stock cuando el producto no está apto para reventa', async () => {
    prepararVenta({ diasDesdeVenta: 3 });

    await service.create({ ...DTO_BASE, aptoReingreso: false }, VENDEDOR);

    expect(repos.get(Producto)!.save).not.toHaveBeenCalled();
    expect(repos.get(MovimientoStock)!.save).not.toHaveBeenCalled();
  });

  it('emite la nota de crédito y acredita el saldo en la cuenta corriente', async () => {
    prepararVenta({ diasDesdeVenta: 1 });

    await service.create({ ...DTO_BASE, cantidad: 2 }, VENDEDOR);

    const notaCredito = repos.get(NotaCredito)!.create.mock.calls[0][0] as { numero: string; monto: number };
    expect(notaCredito.numero).toBe('NC-00007');
    expect(notaCredito.monto).toBe(2000);

    const movimiento = repos.get(MovimientoCtaCte)!.create.mock.calls[0][0] as {
      tipo: TipoMovimientoCtaCte;
      monto: number;
      saldoResultante: number;
    };
    expect(movimiento.tipo).toBe(TipoMovimientoCtaCte.NOTA_CREDITO);
    expect(movimiento.monto).toBe(-2000);
    expect(movimiento.saldoResultante).toBe(3000);

    const cuentaGuardada = repos.get(CuentaCorriente)!.save.mock.calls[0][0] as { saldo: number };
    expect(cuentaGuardada.saldo).toBe(3000);
  });

  it('registra el empleado que autorizó y suma la cantidad devuelta al ítem (auditoría RNF-05)', async () => {
    prepararVenta({ diasDesdeVenta: 1, cantidad: 5, cantidadDevuelta: 1 });

    await service.create({ ...DTO_BASE, cantidad: 2 }, VENDEDOR);

    const devolucion = repos.get(Devolucion)!.create.mock.calls[0][0] as {
      empleadoAutoriza: { idEmpleado: number };
      motivo: string;
    };
    expect(devolucion.empleadoAutoriza.idEmpleado).toBe(9);
    expect(devolucion.motivo).toBe('Producto defectuoso');

    const detalleGuardado = repos.get(VentaDetalle)!.save.mock.calls[0][0] as { cantidadDevuelta: number };
    expect(detalleGuardado.cantidadDevuelta).toBe(3);
  });
});
