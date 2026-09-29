import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/axios.instance';
import { UbicacionesPage } from './UbicacionesPage';

vi.mock('../api/axios.instance', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  getApiErrorMessage: () => 'Error de prueba',
}));

const deposito = { idDeposito: 1, nombre: 'Depósito Principal', direccion: 'Av. Siempre Viva 123' };
const sector = { idSector: 2, nombre: 'Motor', deposito };
const estante = { idEstante: 3, codigo: 'A-01', descripcion: 'Nivel inferior', sector };

describe('UbicacionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/depositos') return Promise.resolve({ data: [deposito] });
      if (url === '/sectores') return Promise.resolve({ data: [sector] });
      return Promise.resolve({ data: [estante] });
    });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.put).mockResolvedValue({ data: {} });
  });

  it('permite crear y modificar depósitos', async () => {
    const user = userEvent.setup();
    render(<UbicacionesPage />);

    const titulo = await screen.findByRole('heading', { name: 'Nuevo depósito' });
    const formulario = within(titulo.closest('.card') as HTMLElement);
    await user.type(formulario.getByLabelText('Nombre *'), 'Depósito Norte');
    await user.type(formulario.getByLabelText('Dirección'), 'Ruta 9 km 12');
    await user.click(formulario.getByRole('button', { name: 'Crear depósito' }));

    expect(api.post).toHaveBeenCalledWith('/depositos', {
      nombre: 'Depósito Norte',
      direccion: 'Ruta 9 km 12',
    });

    await user.click(await screen.findByRole('button', { name: 'Editar depósito Depósito Principal' }));
    const nombre = screen.getByLabelText('Nombre *', { selector: '#deposito-nombre' });
    await user.clear(nombre);
    await user.type(nombre, 'Depósito Central');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(api.put).toHaveBeenCalledWith('/depositos/1', {
      nombre: 'Depósito Central',
      direccion: 'Av. Siempre Viva 123',
    });
  });

  it('mantiene la jerarquía depósito, sector y estante al modificar ubicaciones', async () => {
    const user = userEvent.setup();
    render(<UbicacionesPage />);

    await user.click(await screen.findByRole('button', { name: 'Editar sector Motor' }));
    expect(screen.getByLabelText('Depósito *', { selector: '#sector-deposito' })).toHaveValue('1');
    const nombreSector = screen.getByLabelText('Nombre *', { selector: '#sector-nombre' });
    await user.clear(nombreSector);
    await user.type(nombreSector, 'Suspensión');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(api.put).toHaveBeenCalledWith('/sectores/2', { nombre: 'Suspensión', depositoId: 1 });

    await user.click(await screen.findByRole('button', { name: 'Editar estante A-01' }));
    expect(screen.getByLabelText('Depósito *', { selector: '#estante-deposito' })).toHaveValue('1');
    expect(screen.getByLabelText('Sector *')).toHaveValue('2');
    const codigo = screen.getByLabelText('Código *');
    await user.clear(codigo);
    await user.type(codigo, 'B-04');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(api.put).toHaveBeenCalledWith('/estantes/3', {
      codigo: 'B-04',
      descripcion: 'Nivel inferior',
      sectorId: 2,
    });
  });
});
