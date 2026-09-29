import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/axios.instance';
import { ImportarProductosPage } from './ImportarProductosPage';

vi.mock('../api/axios.instance', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  getApiErrorMessage: () => 'Error de prueba',
}));

const resultadoConError = {
  totalFilas: 2,
  importados: 1,
  conErrores: 1,
  errores: [{
    fila: 3,
    producto: 'Filtro premium',
    errores: ['precio_venta debe ser un número mayor a 0.'],
    datos: {
      nombre: 'Filtro premium',
      descripcion: 'Filtro importado',
      precio_costo: '1200',
      precio_venta: 'MAL',
      stock_inicial: '8',
      stock_minimo: '2',
      punto_pedido: '9',
      categoria: 'Filtros',
      marca: 'Bosch',
      deposito: 'Depósito Principal',
      sector: 'A',
      estante: 'A-01',
    },
  }],
};

describe('ImportarProductosPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carga las filas válidas y permite corregir y reintentar una fila inválida', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: resultadoConError })
      .mockResolvedValueOnce({ data: { totalFilas: 1, importados: 1, conErrores: 0, errores: [] } });
    render(<MemoryRouter><ImportarProductosPage /></MemoryRouter>);

    const archivo = new File(['contenido'], 'productos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(screen.getByLabelText('Archivo de productos'), archivo);

    expect(await screen.findByText('Filtro premium')).toBeInTheDocument();
    expect(screen.getByText('1 cargadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resolver' }));
    expect(screen.getByRole('heading', { name: 'Resolver fila 3' })).toBeInTheDocument();

    const precioVenta = screen.getByLabelText('Precio de venta');
    await user.clear(precioVenta);
    await user.type(precioVenta, '2500');
    await user.click(screen.getByRole('button', { name: 'Corregir y reintentar' }));

    expect(await screen.findByText('No quedan filas pendientes.')).toBeInTheDocument();
    expect(screen.getByText('1 corregidas')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('ofrece crear referencias faltantes u omitir la fila', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: resultadoConError });
    render(<MemoryRouter><ImportarProductosPage /></MemoryRouter>);

    await user.upload(screen.getByLabelText('Archivo de productos'), new File(['contenido'], 'productos.csv', { type: 'text/csv' }));
    await user.click(await screen.findByRole('button', { name: 'Resolver' }));

    expect(screen.getByRole('link', { name: /Crear categoría o marca/i })).toHaveAttribute('href', '/productos/catalogos');
    expect(screen.getByRole('link', { name: /Crear depósito, sector o estante/i })).toHaveAttribute('href', '/productos/ubicaciones');
    await user.click(screen.getByRole('button', { name: 'Omitir esta fila' }));
    expect(await screen.findByText('No quedan filas pendientes.')).toBeInTheDocument();
    expect(screen.getByText('1 omitidas')).toBeInTheDocument();
  });
});
