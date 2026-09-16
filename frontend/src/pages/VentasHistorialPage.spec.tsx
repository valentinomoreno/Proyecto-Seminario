import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ventasApi } from '../api/ventas.service';
import type { VentaResponse } from '../types/venta.types';
import { VentasHistorialPage } from './VentasHistorialPage';

vi.mock('../api/axios.instance', () => ({
  getApiErrorMessage: () => 'Error de prueba',
}));

vi.mock('../api/ventas.service', () => ({
  ventasApi: {
    getVentas: vi.fn(),
    getVenta: vi.fn(),
  },
}));

const venta: VentaResponse = {
  idVenta: 10,
  numeroVenta: 'VTA-00000010',
  fecha: '2026-09-16T18:00:00.000Z',
  subtotal: 1000,
  iva: 0,
  total: 1000,
  modalidadPago: 'CUENTA_CORRIENTE',
  estado: 'COMPLETADA',
  cliente: {
    idCliente: 5,
    tipo: 'PERSONA',
    telefono: null,
    correo: null,
    direccion: null,
    condicionIva: { idCondicionIva: 1, codigo: 'CONSUMIDOR_FINAL', nombre: 'Consumidor Final' },
    persona: { nombre: 'Ana', apellido: 'Pérez', dni: '30111222', cuil: '20301112220' },
    empresa: null,
  },
  detalles: [{
    idDetalleVenta: 1,
    producto: { idProducto: 2, sku: 'PROD-00002', nombre: 'Filtro' },
    cantidad: 1,
    precioUnitario: 1000,
    subtotal: 1000,
    cantidadDevuelta: 0,
  }],
  factura: {
    idFactura: 3,
    tipoFactura: 'REMITO',
    numeroFactura: 'REM-0001-00000010',
    fechaEmision: '2026-09-16T18:00:00.000Z',
    subtotal: 1000,
    iva: 0,
    total: 1000,
  },
};

describe('VentasHistorialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ventasApi.getVentas).mockResolvedValue({
      data: [venta],
      meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
    vi.mocked(ventasApi.getVenta).mockResolvedValue(venta);
  });

  it('muestra las ventas registradas y permite consultar su detalle', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><VentasHistorialPage /></MemoryRouter>);

    expect(await screen.findByText('VTA-00000010')).toBeInTheDocument();
    expect(screen.getByText('Pérez, Ana')).toBeInTheDocument();
    expect(screen.getByText('Cuenta corriente')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(await screen.findByText('Detalle de la venta')).toBeInTheDocument();
    expect(ventasApi.getVenta).toHaveBeenCalledWith(10);
  });
});
