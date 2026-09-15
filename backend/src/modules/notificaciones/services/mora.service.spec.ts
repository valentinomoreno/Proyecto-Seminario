import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { TipoCliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../../cuentas-corrientes/entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-corriente.enum';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../../cuentas-corrientes/repositories/interfaces/cuentas-corrientes-repository.interface';
import {
  IMovimientosCtaCorrienteRepository,
  MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY,
} from '../../cuentas-corrientes/repositories/interfaces/movimientos-cta-corriente-repository.interface';
import { MoraService } from './mora.service';

describe('MoraService (proceso programado de mora del 10%)', () => {
  let service: MoraService;
  let mockCuentasRepo: jest.Mocked<ICuentasCorrientesRepository>;
  let mockMovimientosRepo: jest.Mocked<IMovimientosCtaCorrienteRepository>;
  let mockCuentasManagerRepo: { findOne: jest.Mock; save: jest.Mock };
  let mockMovimientosManagerRepo: { create: jest.Mock; save: jest.Mock };
  let mockDataSource: { transaction: jest.Mock };

  const cuentaDeudora = (saldo: number): CuentaCorriente =>
    ({
      idCuentaCorriente: 1,
      numeroCuenta: 'CC-000001',
      saldo,
      activa: true,
      cliente: {
        idCliente: 7,
        tipo: TipoCliente.PERSONA,
        correo: 'ana@example.com',
        persona: { nombre: 'Ana', apellido: 'Gómez' },
        empresa: null,
      },
    }) as unknown as CuentaCorriente;

  beforeEach(async () => {
    mockCuentasRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      findByClienteId: jest.fn(),
      findConSaldoDeudor: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      generateNextNumber: jest.fn(),
    };

    mockMovimientosRepo = {
      findByCuenta: jest.fn(),
      existeMoraEnMes: jest.fn(),
    };

    mockCuentasManagerRepo = {
      findOne: jest.fn(),
      save: jest.fn((cuenta: CuentaCorriente) => Promise.resolve(cuenta)),
    };

    mockMovimientosManagerRepo = {
      create: jest.fn((data: Partial<MovimientoCtaCorriente>) => data),
      save: jest.fn((movimiento: Partial<MovimientoCtaCorriente>) => Promise.resolve(movimiento)),
    };

    const managerFalso = {
      getRepository: jest.fn((entidad: unknown) =>
        entidad === CuentaCorriente ? mockCuentasManagerRepo : mockMovimientosManagerRepo,
      ),
    } as unknown as EntityManager;

    mockDataSource = {
      transaction: jest.fn((cb: (manager: EntityManager) => Promise<unknown>) => cb(managerFalso)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoraService,
        { provide: CUENTAS_CORRIENTES_REPOSITORY, useValue: mockCuentasRepo },
        { provide: MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY, useValue: mockMovimientosRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<MoraService>(MoraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('el día 7 no aplica ninguna mora', async () => {
    const resultado = await service.ejecutar(new Date(2026, 8, 7));

    expect(resultado).toEqual({ aplicadas: 0, omitidas: 0 });
    expect(mockCuentasRepo.findConSaldoDeudor).not.toHaveBeenCalled();
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  // Criterio de aceptación textual del TP (RNF-14, proceso 2).
  it('el día 8 sobre una cuenta con saldo impago de $100.000 actualiza el saldo a $110.000 registrando su respectivo MovimientoCtaCte', async () => {
    const cuenta = cuentaDeudora(100000);
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([cuenta]);
    mockMovimientosRepo.existeMoraEnMes.mockResolvedValue(false);
    mockCuentasManagerRepo.findOne.mockResolvedValue(cuenta);

    const resultado = await service.ejecutar(new Date(2026, 8, 8));

    expect(resultado).toEqual({ aplicadas: 1, omitidas: 0 });

    // Bloqueo pesimista por PK (sin JOIN sobre la relación cliente).
    expect(mockCuentasManagerRepo.findOne).toHaveBeenCalledWith({
      where: { idCuentaCorriente: 1 },
      lock: { mode: 'pessimistic_write' },
    });

    const movimientoCreado = mockMovimientosManagerRepo.create.mock.calls[0][0] as Partial<MovimientoCtaCorriente>;
    expect(movimientoCreado.tipo).toBe(TipoMovimientoCtaCorriente.MORA);
    expect(movimientoCreado.monto).toBe(10000);
    expect(movimientoCreado.saldoPosterior).toBe(110000);
    expect(mockMovimientosManagerRepo.save).toHaveBeenCalledTimes(1);

    const cuentaGuardada = mockCuentasManagerRepo.save.mock.calls[0][0] as CuentaCorriente;
    expect(cuentaGuardada.saldo).toBe(110000);
  });

  it('el día 15 omite la cuenta si ya tiene una mora aplicada este mes', async () => {
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([cuentaDeudora(100000)]);
    mockMovimientosRepo.existeMoraEnMes.mockResolvedValue(true);

    const resultado = await service.ejecutar(new Date(2026, 8, 15));

    expect(resultado).toEqual({ aplicadas: 0, omitidas: 1 });
    expect(mockMovimientosRepo.existeMoraEnMes).toHaveBeenCalledWith(1, new Date(2026, 8, 1, 0, 0, 0, 0));
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });
});
