import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { Cliente } from '../entities/cliente.entity';
import { CLIENTES_REPOSITORY, IClientesRepository } from '../repositories/interfaces/clientes-repository.interface';
import { ClientesService } from './clientes.service';

describe('ClientesService with Repository (DIP)', () => {
  let service: ClientesService;
  let mockClientesRepo: jest.Mocked<IClientesRepository>;
  let mockClienteEntityRepo: { create: jest.Mock; save: jest.Mock };
  let mockCuentaEntityRepo: { create: jest.Mock; save: jest.Mock };
  let mockDataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    mockClientesRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    mockClienteEntityRepo = {
      create: jest.fn((data: Partial<Cliente>) => ({ idCliente: 1, ...data })),
      save: jest.fn((cliente: Cliente) => Promise.resolve(cliente)),
    };

    mockCuentaEntityRepo = {
      create: jest.fn((data: Partial<CuentaCorriente>) => ({ idCuentaCorriente: 1, ...data })),
      save: jest.fn((cuenta: CuentaCorriente) => Promise.resolve(cuenta)),
    };

    const fakeManager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Cliente ? mockClienteEntityRepo : mockCuentaEntityRepo,
      ),
    } as unknown as EntityManager;

    mockDataSource = {
      transaction: jest.fn((callback: (manager: EntityManager) => Promise<unknown>) => callback(fakeManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        {
          provide: CLIENTES_REPOSITORY,
          useValue: mockClientesRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findOne lanza NotFoundException cuando el cliente no existe', async () => {
    mockClientesRepo.findById.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    expect(mockClientesRepo.findById).toHaveBeenCalledWith(999);
  });

  it('create crea el cliente y su cuenta corriente con saldo 0 en una transacción', async () => {
    const dto = {
      nombre: ' Ana ',
      apellido: ' Pérez ',
      dniCuit: '20304050',
      email: ' ana@test.com ',
      telefono: ' 3415551234 ',
    };

    const result = await service.create(dto);

    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(mockClienteEntityRepo.create).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellido: 'Pérez',
      dniCuit: '20304050',
      email: 'ana@test.com',
      telefono: '3415551234',
      activo: true,
    });
    expect(mockCuentaEntityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ saldo: 0, fechaUltimoMovimiento: null }),
    );
    expect(mockCuentaEntityRepo.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      idCliente: 1,
      nombre: 'Ana',
      apellido: 'Pérez',
      dniCuit: '20304050',
      email: 'ana@test.com',
      telefono: '3415551234',
      activo: true,
      saldoCuentaCorriente: 0,
    });
  });
});
