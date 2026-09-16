import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarcasService } from '../services/marcas.service';
import { CATEGORIAS_REPOSITORY, ICategoriasRepository } from './interfaces/categorias-repository.interface';
import { IMarcasRepository, MARCAS_REPOSITORY } from './interfaces/marcas-repository.interface';
import { IProductosRepository, PRODUCTOS_REPOSITORY } from './interfaces/productos-repository.interface';

describe('MarcasService', () => {
  let service: MarcasService;
  let marcasRepository: jest.Mocked<IMarcasRepository>;
  let categoriasRepository: jest.Mocked<ICategoriasRepository>;

  beforeEach(async () => {
    marcasRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      setCategorias: jest.fn(),
      softRemove: jest.fn(),
    };
    categoriasRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    const productosRepository = {
      countByMarca: jest.fn(),
    } as unknown as jest.Mocked<IProductosRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarcasService,
        { provide: MARCAS_REPOSITORY, useValue: marcasRepository },
        { provide: CATEGORIAS_REPOSITORY, useValue: categoriasRepository },
        { provide: PRODUCTOS_REPOSITORY, useValue: productosRepository },
      ],
    }).compile();

    service = module.get(MarcasService);
  });

  it('crea una marca y la asocia a las categorías seleccionadas', async () => {
    const categoria = { idCategoria: 3, nombre: 'Frenos' } as any;
    const creada = { idMarca: 7, nombre: 'Bosch' } as any;
    const relacionada = { ...creada, categorias: [categoria] };
    categoriasRepository.findByIds.mockResolvedValue([categoria]);
    marcasRepository.create.mockReturnValue(creada);
    marcasRepository.save.mockResolvedValue(creada);
    marcasRepository.findById.mockResolvedValue(relacionada);

    const result = await service.create({ nombre: ' Bosch ', categoriaIds: [3] });

    expect(marcasRepository.setCategorias).toHaveBeenCalledWith(7, [3]);
    expect(result).toBe(relacionada);
  });

  it('rechaza asociaciones con categorías inexistentes', async () => {
    categoriasRepository.findByIds.mockResolvedValue([]);

    await expect(service.create({ nombre: 'SKF', categoriaIds: [99] })).rejects.toBeInstanceOf(BadRequestException);
    expect(marcasRepository.save).not.toHaveBeenCalled();
  });
});
