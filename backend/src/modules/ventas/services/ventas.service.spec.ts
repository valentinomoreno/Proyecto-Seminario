import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CLIENTES_REPOSITORY, IClientesRepository } from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { CondicionIva } from '../../clientes/enums/condicion-iva.enum';
import { MetodoCobro } from '../enums/metodo-cobro.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';
import { IVentasRepository, VENTAS_REPOSITORY } from '../repositories/interfaces/ventas-repository.interface';
import { VentasService } from './ventas.service';

describe('VentasService', () => {
  let service: VentasService;
  let mockVentasRepo: jest.Mocked<IVentasRepository>;
  let mockClientesRepo: jest.Mocked<IClientesRepository>;

  const clienteConCtaCte = {
    idCliente: 1,
    condicionIva: CondicionIva.RESPONSABLE_INSCRIPTO,
    cuentaCorrienteHabilitada: true,
    limiteCredito: 500000,
    persona: { idPersona: 1, nombre: 'Juan', apellido: 'Pérez', dni: '30111222', cuil: '20301112229' },
    fechaBaja: null,
  };

  const clienteSinCtaCte = {
    idCliente: 2,
    condicionIva: CondicionIva.CONSUMIDOR_FINAL,
    cuentaCorrienteHabilitada: false,
    limiteCredito: 0,
    persona: { idPersona: 2, nombre: 'María', apellido: 'Gómez', dni: '40333444', cuil: '27403334448' },
    fechaBaja: null,
  };

  beforeEach(async () => {
    mockVentasRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      registrarVentaTransaccional: jest.fn(),
    };

    mockClientesRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      findByDniOrCuil: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createPersona: jest.fn(),
      savePersona: jest.fn(),
      findPersonaByDniOrCuil: jest.fn(),
      createCuentaCorriente: jest.fn(),
      saveCuentaCorriente: jest.fn(),
      findCuentaCorrienteByClienteId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: VENTAS_REPOSITORY, useValue: mockVentasRepo },
        { provide: CLIENTES_REPOSITORY, useValue: mockClientesRepo },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe registrar una venta al contado delegando en el repositorio transaccional', async () => {
    mockClientesRepo.findById.mockResolvedValue(clienteConCtaCte as any);
    const mockVentaResult = { idVenta: 10, numeroVenta: 'VTA-00000010', total: 70000 } as any;
    mockVentasRepo.registrarVentaTransaccional.mockResolvedValue(mockVentaResult);

    const dto = {
      idCliente: 1,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      items: [{ idProducto: 1, cantidad: 2 }],
    };

    const result = await service.registrarVenta(1, dto);

    expect(mockClientesRepo.findById).toHaveBeenCalledWith(1);
    expect(mockVentasRepo.registrarVentaTransaccional).toHaveBeenCalledWith({
      idUsuario: 1,
      idCliente: 1,
      condicionIva: CondicionIva.RESPONSABLE_INSCRIPTO,
      cuentaCorrienteHabilitada: true,
      limiteCredito: 500000,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      referenciaPago: undefined,
      items: [{ idProducto: 1, cantidad: 2 }],
    });
    expect(result).toEqual(mockVentaResult);
  });

  it('debe fallar si la venta al contado no especifica método de cobro', async () => {
    mockClientesRepo.findById.mockResolvedValue(clienteConCtaCte as any);

    const dto = {
      idCliente: 1,
      modalidadPago: ModalidadPago.CONTADO,
      items: [{ idProducto: 1, cantidad: 1 }],
    };

    await expect(service.registrarVenta(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('debe registrar venta a cuenta corriente si el cliente está habilitado', async () => {
    mockClientesRepo.findById.mockResolvedValue(clienteConCtaCte as any);
    const mockVentaResult = { idVenta: 11, numeroVenta: 'VTA-00000011', total: 35000 } as any;
    mockVentasRepo.registrarVentaTransaccional.mockResolvedValue(mockVentaResult);

    const dto = {
      idCliente: 1,
      modalidadPago: ModalidadPago.CUENTA_CORRIENTE,
      items: [{ idProducto: 1, cantidad: 1 }],
    };

    const result = await service.registrarVenta(1, dto);

    expect(mockVentasRepo.registrarVentaTransaccional).toHaveBeenCalled();
    expect(result).toEqual(mockVentaResult);
  });

  it('debe rechazar venta a cuenta corriente si el cliente no tiene cuenta corriente habilitada', async () => {
    mockClientesRepo.findById.mockResolvedValue(clienteSinCtaCte as any);

    const dto = {
      idCliente: 2,
      modalidadPago: ModalidadPago.CUENTA_CORRIENTE,
      items: [{ idProducto: 1, cantidad: 1 }],
    };

    await expect(service.registrarVenta(1, dto)).rejects.toThrow(
      'El cliente seleccionado no tiene cuenta corriente habilitada.',
    );
  });

  it('debe lanzar NotFoundException si el cliente no existe', async () => {
    mockClientesRepo.findById.mockResolvedValue(null);

    const dto = {
      idCliente: 999,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      items: [{ idProducto: 1, cantidad: 1 }],
    };

    await expect(service.registrarVenta(1, dto)).rejects.toThrow(NotFoundException);
  });
});
