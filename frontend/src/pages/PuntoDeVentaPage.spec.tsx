import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/axios.instance';
import { clientesApi } from '../api/clientes.service';
import { pagosApi } from '../api/pagos.service';
import { ventasApi } from '../api/ventas.service';
import { PuntoDeVentaPage } from './PuntoDeVentaPage';

const limpiarCarrito = vi.hoisted(() => vi.fn());
vi.mock('../api/axios.instance', () => ({ api: { get: vi.fn() }, getApiErrorMessage: () => 'Error' }));
vi.mock('../api/clientes.service', () => ({ clientesApi: { getClientes: vi.fn(), getCliente: vi.fn() } }));
vi.mock('../api/pagos.service', () => ({ pagosApi: { crear: vi.fn(), estado: vi.fn(), estadoPorClave: vi.fn(), cancelar: vi.fn() } }));
vi.mock('../api/ventas.service', () => ({ ventasApi: { registrarVenta: vi.fn(), getVenta: vi.fn() } }));
vi.mock('../context/useCart', () => ({
  useCart: () => ({
    items: [{ idProducto: 7, sku: 'TEST', nombre: 'Repuesto de prueba', descripcion: null,
      precioUnitario: 1200, stock: 3, cantidad: 1, subtotal: 1200 }],
    totalItems: 1, total: 1200, agregarItem: vi.fn(), modificarCantidad: vi.fn(),
    eliminarItem: vi.fn(), limpiarCarrito,
  }),
}));

describe('PuntoDeVentaPage - Mercado Pago QR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    vi.mocked(clientesApi.getClientes).mockResolvedValue({ data: [{
      idCliente: 4, nombreMostrar: 'Cliente de prueba', condicionIva: { codigo: 'CONSUMIDOR_FINAL', nombre: 'Consumidor Final' },
      persona: { dni: '12345678', cuil: '20123456786' }, empresa: null,
      estadoCuenta: 'INACTIVA', cuentaCorriente: null,
    }] } as Awaited<ReturnType<typeof clientesApi.getClientes>>);
    vi.mocked(pagosApi.crear).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111', estado: 'PENDIENTE', qrData: 'codigo-qr',
      monto: 1200, venceEn: '2026-10-27T18:00:00Z', idVenta: null, error: null, reservaActiva: true,
    });
    vi.mocked(pagosApi.estado).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111', estado: 'PENDIENTE', qrData: 'codigo-qr',
      monto: 1200, venceEn: '2026-10-27T18:00:00Z', idVenta: null, error: null, reservaActiva: true,
    });
  });

  it('abre el QR y espera el pago antes de registrar la venta', async () => {
    const user = userEvent.setup();
    render(<PuntoDeVentaPage />);
    await screen.findByText(/Cliente de prueba/);
    await user.selectOptions(screen.getByLabelText('MÉTODO DE COBRO'), 'MERCADO_PAGO');
    await user.click(screen.getByRole('button', { name: /Generar QR de cobro/i }));
    await user.click(screen.getByRole('button', { name: 'Generar QR' }));
    await waitFor(() => expect(pagosApi.crear).toHaveBeenCalledWith(4, [{ idProducto: 7, cantidad: 1 }],
      '11111111-1111-4111-8111-111111111111'));
    expect(screen.getByRole('dialog', { name: 'Cobro Mercado Pago QR' })).toBeInTheDocument();
    expect(ventasApi.registrarVenta).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('autopartes_qr_activo')).toBe('11111111-1111-4111-8111-111111111111');
  });
});
