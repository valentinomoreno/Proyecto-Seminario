import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { CreateClientePersonaDto } from '../dto/cliente.dto';
import { ClientePersona } from '../entities/cliente-persona.entity';
import { Cliente, TipoCliente } from '../entities/cliente.entity';
import { CondicionIva } from '../entities/condicion-iva.entity';
import { CLIENTES_REPOSITORY, IClientesRepository } from '../repositories/interfaces/clientes-repository.interface';
import {
  CONDICIONES_IVA_REPOSITORY,
  ICondicionesIvaRepository,
} from '../repositories/interfaces/condiciones-iva-repository.interface';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  let service: ClientesService;
  let clientesRepository: jest.Mocked<IClientesRepository>;
  let condicionesRepository: jest.Mocked<ICondicionesIvaRepository>;

  const condicion = Object.assign(new CondicionIva(), {
    idCondicionIva: 1,
    codigo: 'CONSUMIDOR_FINAL',
    nombre: 'Consumidor Final',
    clientes: [],
  });

  function clientePersona(cuentaCorriente: CuentaCorriente | null = null): Cliente {
    const cliente = Object.assign(new Cliente(), {
      idCliente: 1,
      tipo: TipoCliente.PERSONA,
      telefono: null,
      correo: null,
      direccion: null,
      condicionIva: condicion,
      empresa: null,
      cuentaCorriente,
      fechaBaja: null,
    });
    cliente.persona = Object.assign(new ClientePersona(), {
      idClientePersona: 1,
      nombre: 'Ana',
      apellido: 'Pérez',
      dni: '12345678',
      cuil: '20123456786',
      cliente,
    });
    return cliente;
  }

  beforeEach(async () => {
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
    condicionesRepository = { findAll: jest.fn(), findById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: CLIENTES_REPOSITORY, useValue: clientesRepository },
        { provide: CONDICIONES_IVA_REPOSITORY, useValue: condicionesRepository },
      ],
    }).compile();
    service = moduleRef.get(ClientesService);
  });

  it('rechaza una condición de IVA inexistente', async () => {
    condicionesRepository.findById.mockResolvedValue(null);
    await expect(service.createPersona({ condicionIvaId: 99 } as CreateClientePersonaDto))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('informa específicamente un DNI duplicado', async () => {
    condicionesRepository.findById.mockResolvedValue(condicion);
    clientesRepository.existsPersonaByDni.mockResolvedValue(true);
    await expect(service.createPersona({
      nombre: 'Ana', apellido: 'Pérez', dni: '12345678', cuil: '20123456786', condicionIvaId: 1,
    })).rejects.toThrow('Ya existe un cliente con ese DNI.');
  });

  it('bloquea la baja cuando la cuenta está activa', async () => {
    const cuenta = Object.assign(new CuentaCorriente(), { activa: true });
    clientesRepository.findById.mockResolvedValue(clientePersona(cuenta));
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(clientesRepository.softRemove).not.toHaveBeenCalled();
  });

  it('rechaza una modificación de contacto vacía', async () => {
    await expect(service.update(1, {})).rejects.toBeInstanceOf(BadRequestException);
  });
});
