import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/axios.instance';
import type { DashboardData } from '../types/dashboard.types';
import { DashboardPage } from './DashboardPage';

vi.mock('../api/axios.instance', () => ({
  api: { get: vi.fn() },
  getApiErrorMessage: () => 'Error de prueba',
}));

const data: DashboardData = {
  actualizadoEn: '2026-09-23T15:00:00.000Z',
  ventas: {
    mesActual: 'septiembre de 2026',
    mesAnterior: 'agosto de 2026',
    totalActual: 150000,
    totalAnterior: 100000,
    operacionesActual: 12,
    operacionesAnterior: 8,
    puntos: Array.from({ length: 30 }, (_, index) => ({
      dia: index + 1,
      actual: index === 0 ? 150000 : 0,
      anterior: index === 0 ? 100000 : 0,
      operacionesActual: index === 0 ? 12 : 0,
      operacionesAnterior: index === 0 ? 8 : 0,
    })),
  },
  metodosPago: [
    { metodo: 'EFECTIVO', cantidad: 4, total: 50000 },
    { metodo: 'MERCADO_PAGO', cantidad: 3, total: 40000 },
    { metodo: 'CUENTA_CORRIENTE', cantidad: 5, total: 60000 },
    { metodo: 'OTROS', cantidad: 0, total: 0 },
  ],
  cuentas: {
    diaInicioMora: 8,
    resumen: { alDia: 1, enCobro: 0, enMora: 1 },
    clientes: [
      { idCuentaCorriente: 1, numeroCuenta: 'CC-000001', cliente: 'Cliente al día', saldo: 0, estado: 'AL_DIA' },
      { idCuentaCorriente: 2, numeroCuenta: 'CC-000002', cliente: 'Cliente en mora', saldo: 25000, estado: 'EN_MORA' },
    ],
  },
  inventario: { alertasStock: 3 },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data });
  });

  it('muestra KPIs y permite filtrar el semáforo de clientes', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText('Dashboard de Administración')).toBeInTheDocument();
    expect(screen.getByText('+50.0%')).toBeInTheDocument();
    expect(screen.getByText('Cliente en mora')).toBeInTheDocument();
    expect(screen.queryByText('Cliente al día')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Al día/i }));
    expect(screen.getByText('Cliente al día')).toBeInTheDocument();
    expect(screen.queryByText('Cliente en mora')).not.toBeInTheDocument();
  });
});
