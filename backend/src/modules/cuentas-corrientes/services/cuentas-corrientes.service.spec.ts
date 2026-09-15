import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Cliente, TipoCliente } from '../../clientes/entities/cliente.entity';
import { CLIENTES_REPOSITORY, IClientesRepository } from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { CuentaCorriente } from '../entities/cuenta-corriente.entity';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../repositories/interfaces/cuentas-corrientes-repository.interface';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

describe('CuentasCorrientesService', () => {
  let service: CuentasCorrientesService;
  let cuentasRepository: jest.Mocked<ICuentasCorrientesRepository>;
  let clientesRepository: jest.Mocked<IClientesRepository>;
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
      create: jest.fn((data) => Object.assign(new CuentaCorriente(), data)),
      save: jest.fn(),
      generateNextNumber: jest.fn(),
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
});
