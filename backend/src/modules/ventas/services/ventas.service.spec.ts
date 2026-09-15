import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CLIENTES_REPOSITORY,
  IClientesRepository,
} from '../../clientes/repositories/interfaces/clientes-repository.interface';
import { MetodoCobro } from '../enums/metodo-cobro.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';
import {
  IVentasRepository,
  VENTAS_REPOSITORY,
} from '../repositories/interfaces/ventas-repository.interface';
import { VentasService } from './ventas.service';

describe('VentasService', () => {
  let service: VentasService;
  let ventasRepository: jest.Mocked<IVentasRepository>;
  let clientesRepository: jest.Mocked<IClientesRepository>;

  const clienteConCuenta = {
    idCliente: 1,
    cuentaCorriente: { activa: true, saldo: 0, limiteCredito: 500000 },
  };
  const clienteSinCuenta = { idCliente: 2, cuentaCorriente: null };

  beforeEach(async () => {
    ventasRepository = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      registrarVentaTransaccional: jest.fn(),
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

    const module = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: VENTAS_REPOSITORY, useValue: ventasRepository },
        { provide: CLIENTES_REPOSITORY, useValue: clientesRepository },
      ],
    }).compile();
    service = module.get(VentasService);
  });

  it('registra una venta de contado con el usuario autenticado', async () => {
    clientesRepository.findById.mockResolvedValue(clienteConCuenta as never);
    ventasRepository.registrarVentaTransaccional.mockResolvedValue({ idVenta: 10 } as never);

    await service.registrarVenta(7, {
      idCliente: 1,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      items: [{ idProducto: 3, cantidad: 2 }],
    });

    expect(ventasRepository.registrarVentaTransaccional).toHaveBeenCalledWith({
      idUsuario: 7,
      idCliente: 1,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      referenciaPago: undefined,
      items: [{ idProducto: 3, cantidad: 2 }],
    });
  });

  it('rechaza contado sin método de cobro', async () => {
    clientesRepository.findById.mockResolvedValue(clienteConCuenta as never);
    await expect(service.registrarVenta(1, {
      idCliente: 1,
      modalidadPago: ModalidadPago.CONTADO,
      items: [{ idProducto: 1, cantidad: 1 }],
    })).rejects.toThrow(BadRequestException);
  });

  it('rechaza cuenta corriente inactiva o inexistente', async () => {
    clientesRepository.findById.mockResolvedValue(clienteSinCuenta as never);
    await expect(service.registrarVenta(1, {
      idCliente: 2,
      modalidadPago: ModalidadPago.CUENTA_CORRIENTE,
      items: [{ idProducto: 1, cantidad: 1 }],
    })).rejects.toThrow('no tiene una cuenta corriente activa');
  });

  it('rechaza productos duplicados para impedir validar stock por separado', async () => {
    clientesRepository.findById.mockResolvedValue(clienteConCuenta as never);
    await expect(service.registrarVenta(1, {
      idCliente: 1,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      items: [
        { idProducto: 1, cantidad: 3 },
        { idProducto: 1, cantidad: 4 },
      ],
    })).rejects.toThrow('Cada producto debe aparecer una sola vez');
  });

  it('rechaza un cliente inexistente', async () => {
    clientesRepository.findById.mockResolvedValue(null);
    await expect(service.registrarVenta(1, {
      idCliente: 999,
      modalidadPago: ModalidadPago.CONTADO,
      metodoCobro: MetodoCobro.EFECTIVO,
      items: [{ idProducto: 1, cantidad: 1 }],
    })).rejects.toThrow(NotFoundException);
  });
});
