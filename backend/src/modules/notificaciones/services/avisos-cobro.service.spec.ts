import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TipoCliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../../cuentas-corrientes/repositories/interfaces/cuentas-corrientes-repository.interface';
import { AvisoCobroEnviado } from '../entities/aviso-cobro-enviado.entity';
import { IMailService, MAIL_SERVICE } from '../interfaces/mail-service.interface';
import { AvisosCobroService } from './avisos-cobro.service';

describe('AvisosCobroService (proceso programado de avisos de cobro)', () => {
  let service: AvisosCobroService;
  let mockCuentasRepo: jest.Mocked<ICuentasCorrientesRepository>;
  let mockMailService: jest.Mocked<IMailService>;
  let mockAvisosRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };

  const cuentaDeudora = (idCuenta: number, idCliente: number, correo: string | null, saldo: number): CuentaCorriente =>
    ({
      idCuentaCorriente: idCuenta,
      numeroCuenta: `CC-00000${idCuenta}`,
      saldo,
      activa: true,
      cliente: {
        idCliente,
        tipo: TipoCliente.PERSONA,
        correo,
        persona: { nombre: 'Ana', apellido: 'Gómez' },
        empresa: null,
      },
      movimientos: [],
    }) as unknown as CuentaCorriente;

  const cuentaDeudoraEmpresa = (idCuenta: number, idCliente: number, saldo: number): CuentaCorriente =>
    ({
      idCuentaCorriente: idCuenta,
      numeroCuenta: `CC-00000${idCuenta}`,
      saldo,
      activa: true,
      cliente: {
        idCliente,
        tipo: TipoCliente.EMPRESA,
        correo: 'compras@repuestoscentro.com',
        persona: null,
        empresa: { razonSocial: 'Repuestos Centro S.A.' },
      },
      movimientos: [],
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

    mockMailService = { enviar: jest.fn().mockResolvedValue(undefined) };

    mockAvisosRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<AvisoCobroEnviado>) => data),
      save: jest.fn((aviso: Partial<AvisoCobroEnviado>) => Promise.resolve({ idAviso: 1, ...aviso })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvisosCobroService,
        { provide: CUENTAS_CORRIENTES_REPOSITORY, useValue: mockCuentasRepo },
        { provide: MAIL_SERVICE, useValue: mockMailService },
        { provide: getRepositoryToken(AvisoCobroEnviado), useValue: mockAvisosRepo },
      ],
    }).compile();

    service = module.get<AvisosCobroService>(AvisosCobroService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('envía un correo por cada cliente con saldo deudor', async () => {
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([
      cuentaDeudora(1, 7, 'ana@example.com', 100000),
      cuentaDeudora(2, 9, 'juan@example.com', 2500.5),
    ]);

    const resultado = await service.ejecutar();

    expect(resultado).toEqual({ enviados: 2, omitidos: 0 });
    expect(mockMailService.enviar).toHaveBeenCalledTimes(2);

    const primerMensaje = mockMailService.enviar.mock.calls[0][0];
    expect(primerMensaje.to).toBe('ana@example.com');
    expect(primerMensaje.subject).toContain('saldo pendiente');
    expect(primerMensaje.html).toContain('100000.00');
    expect(primerMensaje.html).toContain('Ana Gómez');
    expect(mockMailService.enviar.mock.calls[1][0].to).toBe('juan@example.com');
  });

  it('saluda a los clientes empresa por su razón social', async () => {
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([cuentaDeudoraEmpresa(3, 11, 5000)]);

    const resultado = await service.ejecutar();

    expect(resultado).toEqual({ enviados: 1, omitidos: 0 });
    expect(mockMailService.enviar.mock.calls[0][0].html).toContain('Repuestos Centro S.A.');
  });

  it('omite al cliente deudor que no tiene correo cargado', async () => {
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([
      cuentaDeudora(1, 7, null, 100000),
      cuentaDeudora(2, 9, 'juan@example.com', 2500.5),
    ]);

    const resultado = await service.ejecutar();

    expect(resultado).toEqual({ enviados: 1, omitidos: 1 });
    expect(mockMailService.enviar).toHaveBeenCalledTimes(1);
    expect(mockMailService.enviar.mock.calls[0][0].to).toBe('juan@example.com');
    expect(mockAvisosRepo.save).toHaveBeenCalledTimes(1);
  });

  it('no reenvía el aviso si ya se envió hoy al mismo cliente', async () => {
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([cuentaDeudora(1, 7, 'ana@example.com', 100000)]);
    mockAvisosRepo.findOne.mockResolvedValue({ idAviso: 42, idCliente: 7, fecha: '2026-09-09' });

    const resultado = await service.ejecutar();

    expect(resultado).toEqual({ enviados: 0, omitidos: 1 });
    expect(mockMailService.enviar).not.toHaveBeenCalled();
    expect(mockAvisosRepo.save).not.toHaveBeenCalled();
  });

  it('libera la reserva del día cuando el envío falla, para poder reintentar', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    mockCuentasRepo.findConSaldoDeudor.mockResolvedValue([cuentaDeudora(1, 7, 'ana@example.com', 100000)]);
    mockMailService.enviar.mockRejectedValue(new Error('SMTP caído'));

    const resultado = await service.ejecutar();

    expect(resultado).toEqual({ enviados: 0, omitidos: 1 });
    expect(mockAvisosRepo.delete).toHaveBeenCalledWith({ idAviso: 1 });
  });
});
