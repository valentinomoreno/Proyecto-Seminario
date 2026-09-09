import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCte } from '../../cuentas-corrientes/entities/movimiento-cta-cte.entity';
import { TipoMovimientoCtaCte } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-cte.enum';
import { MovimientoStock } from '../../productos/entities/movimiento-stock.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { TipoMovimientoStock } from '../../productos/enums/tipo-movimiento-stock.enum';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { Venta } from '../entities/venta.entity';
import { VentaDetalle } from '../entities/venta-detalle.entity';
import { IVentasRepository, VENTAS_REPOSITORY } from '../repositories/interfaces/ventas-repository.interface';
import { VentasService } from './ventas.service';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function crearRepoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  };
}

const ADMIN: UsuarioAutenticado = {
  idUsuario: 1,
  nombre: 'admin',
  rol: NombreRol.ADMINISTRADOR,
  idEmpleado: 7,
};

describe('VentasService', () => {
  let service: VentasService;
  let repos: Map<unknown, RepoMock>;
  let manager: EntityManager;
  let queryBuilder: { setLock: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let mockVentasRepo: jest.Mocked<IVentasRepository>;

  beforeEach(async () => {
    repos = new Map<unknown, RepoMock>([
      [Empleado, crearRepoMock()],
      [Cliente, crearRepoMock()],
      [Producto, crearRepoMock()],
      [Venta, crearRepoMock()],
      [VentaDetalle, crearRepoMock()],
      [MovimientoStock, crearRepoMock()],
      [CuentaCorriente, crearRepoMock()],
      [MovimientoCtaCte, crearRepoMock()],
    ]);

    queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    manager = {
      getRepository: jest.fn((entity: unknown) => repos.get(entity)),
      createQueryBuilder: jest.fn(() => queryBuilder),
      query: jest.fn().mockResolvedValue([{ nextval: '3' }]),
    } as unknown as EntityManager;

    mockVentasRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      findByNumeroComprobante: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn((work: (m: EntityManager) => Promise<unknown>) => work(manager)),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: VENTAS_REPOSITORY, useValue: mockVentasRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
  });

  function prepararEscenarioFeliz(stockDisponible: number) {
    repos.get(Empleado)!.findOneBy.mockResolvedValue({ idEmpleado: 7, legajo: 'ADMIN-001' });
    repos.get(Cliente)!.findOneBy.mockResolvedValue({ idCliente: 4, activo: true });
    repos.get(Producto)!.findOne.mockResolvedValue({
      idProducto: 10,
      nombre: 'Filtro de aceite',
      stock: stockDisponible,
      precioUnitario: 1000,
    });
    repos.get(Venta)!.save.mockImplementation((venta: Record<string, unknown>) =>
      Promise.resolve({ ...venta, idVenta: 55 }),
    );
    queryBuilder.getOne.mockResolvedValue({ idCuentaCorriente: 2, saldo: 500, fechaUltimoMovimiento: null });
  }

  it('rechaza registrar una venta si el usuario no tiene empleado asociado', async () => {
    const sinEmpleado: UsuarioAutenticado = { ...ADMIN, idEmpleado: null };

    await expect(service.create({ idCliente: 4, items: [{ idProducto: 10, cantidad: 1 }] }, sinEmpleado))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza la venta cuando el stock es insuficiente', async () => {
    prepararEscenarioFeliz(2);

    await expect(service.create({ idCliente: 4, items: [{ idProducto: 10, cantidad: 5 }] }, ADMIN))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repos.get(Venta)!.save).not.toHaveBeenCalled();
  });

  it('suma las cantidades repetidas del mismo producto antes de validar el stock', async () => {
    prepararEscenarioFeliz(5);

    await expect(
      service.create(
        { idCliente: 4, items: [{ idProducto: 10, cantidad: 3 }, { idProducto: 10, cantidad: 3 }] },
        ADMIN,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('descuenta stock, registra el movimiento de kardex e imputa la cuenta corriente', async () => {
    prepararEscenarioFeliz(10);

    const resultado = await service.create({ idCliente: 4, items: [{ idProducto: 10, cantidad: 3 }] }, ADMIN);

    expect(resultado.numeroComprobante).toBe('V-00003');
    expect(resultado.total).toBe(3000);

    const productoGuardado = repos.get(Producto)!.save.mock.calls[0][0] as { stock: number };
    expect(productoGuardado.stock).toBe(7);

    const movimientoStock = repos.get(MovimientoStock)!.create.mock.calls[0][0] as {
      tipo: TipoMovimientoStock;
      cantidad: number;
      stockResultante: number;
    };
    expect(movimientoStock.tipo).toBe(TipoMovimientoStock.VENTA);
    expect(movimientoStock.cantidad).toBe(3);
    expect(movimientoStock.stockResultante).toBe(7);

    const movimientoCtaCte = repos.get(MovimientoCtaCte)!.create.mock.calls[0][0] as {
      tipo: TipoMovimientoCtaCte;
      monto: number;
      saldoResultante: number;
    };
    expect(movimientoCtaCte.tipo).toBe(TipoMovimientoCtaCte.IMPUTACION_VENTA);
    expect(movimientoCtaCte.monto).toBe(3000);
    expect(movimientoCtaCte.saldoResultante).toBe(3500);

    const cuentaGuardada = repos.get(CuentaCorriente)!.save.mock.calls[0][0] as { saldo: number };
    expect(cuentaGuardada.saldo).toBe(3500);
  });
});
