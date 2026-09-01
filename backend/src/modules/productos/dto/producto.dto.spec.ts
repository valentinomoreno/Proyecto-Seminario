import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductoDto } from './producto.dto';

describe('CreateProductoDto', () => {
  const valid = {
    nombre: 'Repuesto',
    descripcion: 'Descripción detallada',
    stock: 2,
    precioUnitario: 1500.5,
    categoriaId: 1,
    marcaId: 1,
    estanteId: 1,
  };

  it('acepta un producto válido', async () => {
    expect(await validate(plainToInstance(CreateProductoDto, valid))).toHaveLength(0);
  });

  it('rechaza stock negativo y precio no positivo', async () => {
    const errors = await validate(plainToInstance(CreateProductoDto, { ...valid, stock: -1, precioUnitario: 0 }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['stock', 'precioUnitario']));
  });
});
