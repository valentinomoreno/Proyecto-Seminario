import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/axios.instance';
import { DevolucionesHistorialPage } from './DevolucionesHistorialPage';

vi.mock('../api/axios.instance', () => ({
  api: { get: vi.fn() },
  getApiErrorMessage: () => 'Error de prueba',
}));

describe('DevolucionesHistorialPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra cada devolución asociada a su cliente y comprobante', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{
          idDevolucion: 4,
          fecha: '2026-09-16T12:00:00.000Z',
          cantidadDevuelta: 1,
          motivo: 'No corresponde al vehículo',
          montoDevuelto: 25000,
          aptoReingreso: true,
          cliente: {
            idCliente: 8,
            tipo: 'PERSONA',
            nombreMostrar: 'Pérez, Ana',
            contacto: { telefono: null, correo: null, direccion: null },
            persona: { nombre: 'Ana', apellido: 'Pérez', dni: '12345678', cuil: '20123456786' },
            empresa: null,
          },
          venta: { idVenta: 2, numeroVenta: 'VTA-00000002', fecha: '2026-09-15T12:00:00.000Z' },
          producto: { idProducto: 3, sku: 'PROD-00003', nombre: 'Pastilla de freno' },
          empleadoAutoriza: { idEmpleado: 1, legajo: 'VENTA-001' },
          notaCredito: { idNotaCredito: 4, numero: 'NC-00004', monto: 25000, fechaEmision: '2026-09-16T12:00:00.000Z', estado: 'EMITIDA' },
        }],
        meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
      },
    });

    render(<MemoryRouter><DevolucionesHistorialPage /></MemoryRouter>);

    expect(await screen.findByText('Pérez, Ana')).toBeInTheDocument();
    expect(screen.getByText('VTA-00000002')).toBeInTheDocument();
    expect(screen.getByText('NC-00004')).toBeInTheDocument();
    expect(screen.getByText('Pastilla de freno')).toBeInTheDocument();
  });
});
