import { Test, TestingModule } from '@nestjs/testing';
import { CATEGORIAS_REPOSITORY, ICategoriasRepository } from './interfaces/categorias-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from './interfaces/productos-repository.interface';
import { CategoriasService } from '../services/categorias.service';

describe('CategoriasService with Repository (DIP)', () => {
  let service: CategoriasService;
  let mockCategoriasRepo: jest.Mocked<ICategoriasRepository>;
  let mockProductosRepo: jest.Mocked<IProductosRepository>;

  beforeEach(async () => {
    mockCategoriasRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    mockProductosRepo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      generateNextSku: jest.fn(),
      countByCategoria: jest.fn(),
      countByMarca: jest.fn(),
      countByEstante: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        {
          provide: CATEGORIAS_REPOSITORY,
          useValue: mockCategoriasRepo,
        },
        {
          provide: PRODUCTOS_REPOSITORY,
          useValue: mockProductosRepo,
        },
      ],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll delegates to ICategoriasRepository without ORM coupling', async () => {
    const mockCategorias = [{ idCategoria: 1, nombre: 'Motor', descripcion: null, fechaBaja: null, productos: [] }];
    mockCategoriasRepo.findAll.mockResolvedValue(mockCategorias as any);

    const result = await service.findAll();

    expect(mockCategoriasRepo.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockCategorias);
  });

  it('create delegates to ICategoriasRepository', async () => {
    const dto = { nombre: ' Frenos ' };
    const created = { idCategoria: 2, nombre: 'Frenos' };
    mockCategoriasRepo.create.mockReturnValue(created as any);
    mockCategoriasRepo.save.mockResolvedValue(created as any);

    const result = await service.create(dto);

    expect(mockCategoriasRepo.create).toHaveBeenCalledWith({ nombre: 'Frenos' });
    expect(mockCategoriasRepo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });
});
