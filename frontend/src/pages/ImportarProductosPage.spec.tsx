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

const previsualizacion = {
  token: 'a'.repeat(64),
  nombreArchivo: 'productos.xlsx',
  totalFilas: 2,
  resumen: { nuevos: 1, actualizar: 0, sinCambios: 0, errores: 1 },
  filas: [
    { fila: 2, sku: 'REP-001', producto: 'Filtro válido', estado: 'NUEVO', cambios: [], errores: [], datos: {} },
    {
      fila: 3,
      sku: 'REP-002',
      producto: 'Filtro premium',
      estado: 'ERROR',
      cambios: [],
      errores: ['precio_venta debe ser un número mayor a 0.'],
      datos: { precio_venta: 'MAL' },
    },
  ],
};

describe('ImportarProductosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  it('previsualiza sin confirmar y aplica los cambios solo después de la confirmación', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: previsualizacion })
      .mockResolvedValueOnce({
        data: {
          idImportacion: 7,
          totalProcesados: 2,
          creados: 1,
          actualizados: 0,
          sinCambios: 0,
          errores: 1,
          detalleErrores: [{ fila: 3, sku: 'REP-002', producto: 'Filtro premium', errores: ['Precio inválido.'] }],
        },
      });
    render(<MemoryRouter><ImportarProductosPage /></MemoryRouter>);

    const archivo = new File(['contenido'], 'productos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(screen.getByLabelText('Archivo de productos'), archivo);

    expect(await screen.findByRole('heading', { name: 'Previsualización' })).toBeInTheDocument();
    expect(screen.getByText('REP-001')).toBeInTheDocument();
    expect(screen.getByText('Se creará al confirmar.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Confirmar importación/i }));
    expect(await screen.findByRole('heading', { name: 'Importación completada' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.post).mock.calls[1][0]).toBe('/productos/importacion/confirmar');
  });

  it('permite filtrar errores y ofrece crear las referencias faltantes', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({ data: previsualizacion });
    render(<MemoryRouter><ImportarProductosPage /></MemoryRouter>);

    await user.upload(screen.getByLabelText('Archivo de productos'), new File(['contenido'], 'productos.csv', { type: 'text/csv' }));
    await screen.findByRole('heading', { name: 'Previsualización' });
    await user.click(screen.getByRole('button', { name: 'Con errores' }));

    expect(screen.queryByText('REP-001')).not.toBeInTheDocument();
    expect(screen.getByText('REP-002')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear categoría o marca' })).toHaveAttribute('href', '/productos/catalogos');
    expect(screen.getByRole('link', { name: 'Crear ubicación' })).toHaveAttribute('href', '/productos/ubicaciones');
  });
});
