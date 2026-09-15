import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { Cliente, TipoCliente } from '../../clientes/entities/cliente.entity';
import { CLIENTES_REPOSITORY, IClientesRepository } from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../enums/tipo-movimiento-cta-corriente.enum';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../repositories/interfaces/cuentas-corrientes-repository.interface';
import {
  IMovimientosCtaCorrienteRepository,
  MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY,
} from '../repositories/interfaces/movimientos-cta-corriente-repository.interface';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

describe('CuentasCorrientesService', () => {
  let service: CuentasCorrientesService;
  let cuentasRepository: jest.Mocked<ICuentasCorrientesRepository>;
  let clientesRepository: jest.Mocked<IClientesRepository>;
  let movimientosRepository: jest.Mocked<IMovimientosCtaCorrienteRepository>;
  let cuentasManagerRepository: { findOne: jest.Mock; save: jest.Mock };
  let movimientosManagerRepository: { create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let cliente: Cliente;

  beforeEach(async () => {
    cliente = Object.assign(new Cliente(), {
      idCliente: 7,
      tipo: TipoCliente.EMPRESA,
      persona: null,
      empresa: { razonSocial: 'Repuestos Centro', cuit: '30123456781' },
      condicionIva: { idCondicionIva: 3, codigo: 'RESPONSABLE_INSCRIPTO', nombre: 'Responsable Inscripto' },
    });
    cuentasRepository = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      findByClienteId: jest.fn(),
      findConSaldoDeudor: jest.fn(),
      create: jest.fn((data) => Object.assign(new CuentaCorriente(), data)),
      save: jest.fn(),
      generateNextNumber: jest.fn(),
    };
    movimientosRepository = {
      findByCuenta: jest.fn(),
      existeMoraEnMes: jest.fn(),
    };
    cuentasManagerRepository = {
      findOne: jest.fn(),
      save: jest.fn((cuenta: CuentaCorriente) => Promise.resolve(cuenta)),
    };
    movimientosManagerRepository = {
      create: jest.fn((data: Partial<MovimientoCtaCorriente>) => data),
      save: jest.fn((movimiento: Partial<MovimientoCtaCorriente>) =>
        Promise.resolve({ idMovimientoCtaCte: 55, fecha: new Date(), ...movimiento }),
      ),
    };
    const managerFalso = {
      getRepository: jest.fn((entidad: unknown) =>
        entidad === CuentaCorriente ? cuentasManagerRepository : movimientosManagerRepository,
      ),
    } as unknown as EntityManager;
    dataSource = {
      transaction: jest.fn((cb: (manager: EntityManager) => Promise<unknown>) => cb(managerFalso)),
    };
    clientesRepository = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      existsPersonaByDni: jest.fn(),
      existsPersonaByCuil: jest.fn(),
      existsEmpresaByCuit: jest.fn(),
      createPersona: jest.fn(),
      createEmpresa: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CuentasCorrientesService,
        { provide: CUENTAS_CORRIENTES_REPOSITORY, useValue: cuentasRepository },
        { provide: CLIENTES_REPOSITORY, useValue: clientesRepository },
        { provide: MOVIMIENTOS_CTA_CORRIENTE_REPOSITORY, useValue: movimientosRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(CuentasCorrientesService);
  });

  it('crea una cuenta con número automático y saldo cero', async () => {
    clientesRepository.findById.mockResolvedValue(cliente);
    cuentasRepository.findByClienteId.mockResolvedValue(null);
    cuentasRepository.generateNextNumber.mockResolvedValue('CC-000001');
    cuentasRepository.save.mockImplementation((cuenta) => Promise.resolve(Object.assign(cuenta, { idCuentaCorriente: 1 })));
    cuentasRepository.findById.mockResolvedValue(Object.assign(new CuentaCorriente(), {
      idCuentaCorriente: 1,
      numeroCuenta: 'CC-000001',
      saldo: 0,
      activa: true,
      fechaAlta: new Date(),
      fechaBaja: null,
      cliente,
    }));

    const result = await service.create({ clienteId: 7 });
    expect(result).toMatchObject({ numeroCuenta: 'CC-000001', saldo: 0, estado: 'ACTIVA' });
  });

  it('reactiva la cuenta anterior conservando el número', async () => {
    const cuenta = Object.assign(new CuentaCorriente(), {
      idCuentaCorriente: 2,
      numeroCuenta: 'CC-000009',
      saldo: 0,
      activa: false,
      fechaAlta: new Date(),
      fechaBaja: new Date(),
      cliente,
    });
    clientesRepository.findById.mockResolvedValue(cliente);
    cuentasRepository.findByClienteId.mockResolvedValue(cuenta);
    cuentasRepository.save.mockResolvedValue(cuenta);
    cuentasRepository.findById.mockResolvedValue(cuenta);

    const result = await service.create({ clienteId: 7 });
    expect(result.numeroCuenta).toBe('CC-000009');
    expect(cuenta.activa).toBe(true);
    expect(cuenta.fechaBaja).toBeNull();
    expect(cuentasRepository.generateNextNumber).not.toHaveBeenCalled();
  });

  it('rechaza la baja de una cuenta con saldo pendiente', async () => {
    cuentasRepository.findById.mockResolvedValue(Object.assign(new CuentaCorriente(), {
      activa: true,
      saldo: 150.25,
      cliente,
    }));
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(cuentasRepository.save).not.toHaveBeenCalled();
  });

  describe('historial y pagos (Sprint 4)', () => {
    const cuentaActiva = (saldo: number): CuentaCorriente =>
      Object.assign(new CuentaCorriente(), {
        idCuentaCorriente: 3,
        numeroCuenta: 'CC-000003',
        saldo,
        activa: true,
        fechaAlta: new Date(),
        fechaBaja: null,
        cliente,
      });

    it('devuelve la cuenta del cliente con su historial de movimientos', async () => {
      const cuenta = cuentaActiva(1500);
      cuentasRepository.findByClienteId.mockResolvedValue(cuenta);
      cuentasRepository.findById.mockResolvedValue(cuenta);
      movimientosRepository.findByCuenta.mockResolvedValue([
        Object.assign(new MovimientoCtaCorriente(), {
          idMovimientoCtaCte: 9,
          tipo: TipoMovimientoCtaCorriente.IMPUTACION_VENTA,
          monto: 1500,
          saldoPosterior: 1500,
          fecha: new Date(),
          venta: { idVenta: 4 },
          descripcion: null,
        }),
      ]);

      const result = await service.findHistorialByCliente(7);

      expect(movimientosRepository.findByCuenta).toHaveBeenCalledWith(3);
      expect(result.cuenta).toMatchObject({ idCuentaCorriente: 3, saldo: 1500 });
      expect(result.movimientos).toHaveLength(1);
      expect(result.movimientos[0]).toMatchObject({ tipo: TipoMovimientoCtaCorriente.IMPUTACION_VENTA, monto: 1500 });
    });

    it('registra el pago como movimiento positivo (COBRO_CUENTA) y descuenta el saldo', async () => {
      const cuenta = cuentaActiva(1000);
      cuentasRepository.findByClienteId.mockResolvedValue(cuenta);
      cuentasRepository.findById.mockResolvedValue(cuenta);
      cuentasManagerRepository.findOne.mockResolvedValue(cuenta);

      const result = await service.registrarPago(7, { monto: 400 }, 11);

      // Bloqueo pesimista por PK (sin JOIN sobre la relación cliente).
      expect(cuentasManagerRepository.findOne).toHaveBeenCalledWith({
        where: { idCuentaCorriente: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      const movimientoCreado = movimientosManagerRepository.create.mock.calls[0][0] as Partial<MovimientoCtaCorriente>;
      expect(movimientoCreado.tipo).toBe(TipoMovimientoCtaCorriente.COBRO_CUENTA);
      expect(movimientoCreado.monto).toBe(400);
      expect(movimientoCreado.saldoPosterior).toBe(600);
      expect(cuenta.saldo).toBe(600);
      expect(result.movimiento).toMatchObject({ monto: 400, saldoPosterior: 600 });
    });

    it('rechaza un pago mayor al saldo pendiente', async () => {
      const cuenta = cuentaActiva(1000);
      cuentasRepository.findByClienteId.mockResolvedValue(cuenta);
      cuentasRepository.findById.mockResolvedValue(cuenta);
      cuentasManagerRepository.findOne.mockResolvedValue(cuenta);

      await expect(service.registrarPago(7, { monto: 1200 }, null)).rejects.toBeInstanceOf(BadRequestException);
      expect(movimientosManagerRepository.save).not.toHaveBeenCalled();
      expect(cuentasManagerRepository.save).not.toHaveBeenCalled();
    });
  });
});
