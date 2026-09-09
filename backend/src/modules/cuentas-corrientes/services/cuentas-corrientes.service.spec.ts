import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { TipoMovimientoCtaCte } from '../enums/tipo-movimiento-cta-cte.enum';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../repositories/interfaces/cuentas-corrientes-repository.interface';
import {
  IMovimientosCtaCteRepository,
  MOVIMIENTOS_CTA_CTE_REPOSITORY,
} from '../repositories/interfaces/movimientos-cta-cte-repository.interface';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

describe('CuentasCorrientesService with Repository (DIP)', () => {
  let service: CuentasCorrientesService;
  let mockCuentasRepo: jest.Mocked<ICuentasCorrientesRepository>;
  let mockMovimientosRepo: jest.Mocked<IMovimientosCtaCteRepository>;
  let mockDataSource: { transaction: jest.Mock };
  let managerCuentasRepo: { findOne: jest.Mock; save: jest.Mock };
  let managerMovimientosRepo: { create: jest.Mock; save: jest.Mock };

  const cliente = { idCliente: 7, nombre: 'Ada', apellido: 'Lovelace', email: 'ada@test.com' };

  beforeEach(async () => {
    mockCuentasRepo = {
      findAll: jest.fn(),
      findByCliente: jest.fn(),
      findById: jest.fn(),
      findConSaldoDeudor: jest.fn(),
      save: jest.fn(),
    };

    mockMovimientosRepo = {
      findByCuenta: jest.fn(),
      existeMoraEnMes: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    managerCuentasRepo = {
      findOne: jest.fn(),
      save: jest.fn((cuenta: Record<string, unknown>) => Promise.resolve(cuenta)),
    };

    managerMovimientosRepo = {
      create: jest.fn((data: Record<string, unknown>) => data),
      save: jest.fn((movimiento: Record<string, unknown>) =>
        Promise.resolve({ idMovimientoCtaCte: 99, ...movimiento }),
      ),
    };

    const fakeManager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === CuentaCorriente ? managerCuentasRepo : managerMovimientosRepo,
      ),
    };

    mockDataSource = {
      transaction: jest.fn((runInTransaction: (manager: EntityManager) => Promise<unknown>) =>
        runInTransaction(fakeManager as unknown as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentasCorrientesService,
        {
          provide: CUENTAS_CORRIENTES_REPOSITORY,
          useValue: mockCuentasRepo,
        },
        {
          provide: MOVIMIENTOS_CTA_CTE_REPOSITORY,
          useValue: mockMovimientosRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CuentasCorrientesService>(CuentasCorrientesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findByCliente lanza NotFoundException si el cliente no tiene cuenta corriente', async () => {
    mockCuentasRepo.findByCliente.mockResolvedValue(null);

    await expect(service.findByCliente(123)).rejects.toBeInstanceOf(NotFoundException);
    expect(mockMovimientosRepo.findByCuenta).not.toHaveBeenCalled();
  });

  it('registrarPago rechaza un monto mayor al saldo adeudado', async () => {
    const cuenta = { idCuentaCorriente: 1, cliente, saldo: 1000, fechaUltimoMovimiento: null };
    mockCuentasRepo.findByCliente.mockResolvedValue(cuenta as any);
    managerCuentasRepo.findOne.mockResolvedValue({ ...cuenta });

    await expect(service.registrarPago(7, { monto: 1500 }, 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(managerMovimientosRepo.save).not.toHaveBeenCalled();
    expect(managerCuentasRepo.save).not.toHaveBeenCalled();
  });

  it('registrarPago de $500 sobre saldo $1000 deja saldo $500 y crea un movimiento PAGO de -500', async () => {
    const cuenta = { idCuentaCorriente: 1, cliente, saldo: 1000, fechaUltimoMovimiento: null };
    mockCuentasRepo.findByCliente.mockResolvedValue(cuenta as any);
    managerCuentasRepo.findOne.mockResolvedValue({ ...cuenta });

    const resultado = await service.registrarPago(7, { monto: 500, observaciones: ' Pago parcial ' }, 3);

    expect(managerMovimientosRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: TipoMovimientoCtaCte.PAGO,
        monto: -500,
        saldoResultante: 500,
        empleado: { idEmpleado: 3 },
        observaciones: 'Pago parcial',
      }),
    );

    const cuentaGuardada = managerCuentasRepo.save.mock.calls[0][0];
    expect(cuentaGuardada.saldo).toBe(500);
    expect(cuentaGuardada.fechaUltimoMovimiento).toBeInstanceOf(Date);

    expect(resultado.saldo).toBe(500);
    expect(resultado.movimiento.monto).toBe(-500);
    expect(resultado.movimiento.tipo).toBe(TipoMovimientoCtaCte.PAGO);
    expect(resultado.cliente.idCliente).toBe(7);
  });

  it('registrarPago sin empleado autenticado guarda el movimiento sin empleado', async () => {
    const cuenta = { idCuentaCorriente: 1, cliente, saldo: 200, fechaUltimoMovimiento: null };
    mockCuentasRepo.findByCliente.mockResolvedValue(cuenta as any);
    managerCuentasRepo.findOne.mockResolvedValue({ ...cuenta });

    await service.registrarPago(7, { monto: 200 }, null);

    expect(managerMovimientosRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ empleado: null, monto: -200, saldoResultante: 0 }),
    );
  });
});
