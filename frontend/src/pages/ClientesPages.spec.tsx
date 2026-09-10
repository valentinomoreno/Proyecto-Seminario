import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/axios.instance';
import { AuthContext, type AuthContextValue } from '../context/auth-context';
import type { Rol } from '../types/auth.types';
import type { Cliente } from '../types/cliente.types';
import { ClientesListPage } from './ClientesListPage';
import { FormClientePage } from './FormClientePage';

vi.mock('../api/axios.instance', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getApiErrorMessage: () => 'Error de prueba',
}));

const condicion = { idCondicionIva: 1, codigo: 'CONSUMIDOR_FINAL', nombre: 'Consumidor Final' };

function authValue(rol: Rol): AuthContextValue {
  return {
    autenticado: true,
    usuario: { idUsuario: 1, nombre: 'usuario', rol, idEmpleado: 1 },
    login: () => Promise.reject(new Error('No utilizado')),
    logout: vi.fn(),
  };
}

function renderList(rol: Rol, cliente: Cliente) {
  vi.mocked(api.get).mockResolvedValue({
    data: { data: [cliente], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } },
  });
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue(rol)}>
        <ClientesListPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('pantallas de clientes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('alterna el formulario de alta entre Particular y Empresa', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [condicion] });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/clientes/nuevo']}>
        <Routes>
          <Route path="/clientes/nuevo" element={<FormClientePage />} />
          <Route path="/clientes" element={<h1>Listado</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Nombre *')).toBeInTheDocument();
    await user.click(screen.getByText('Empresa'));
    expect(screen.getByLabelText('Razón social *')).toBeInTheDocument();
    expect(screen.getByLabelText('CUIT *')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre *')).not.toBeInTheDocument();
  });

  it('oculta las acciones de baja al Empleado de Venta', async () => {
    const cliente: Cliente = {
      idCliente: 1,
      tipo: 'PERSONA',
      nombreMostrar: 'Pérez, Ana',
      condicionIva: condicion,
      contacto: { telefono: null, correo: null, direccion: null },
      persona: { nombre: 'Ana', apellido: 'Pérez', dni: '12345678', cuil: '20123456786' },
      empresa: null,
      estadoCuenta: 'ACTIVA',
      cuentaCorriente: { idCuentaCorriente: 1, numeroCuenta: 'CC-000001', saldo: 0, estado: 'ACTIVA' },
    };

    renderList('EMPLEADO_VENTA', cliente);
    expect(await screen.findByText('Pérez, Ana')).toBeInTheDocument();
    expect(screen.queryByTitle('Dar de baja la cuenta')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Debe dar de baja la cuenta primero')).not.toBeInTheDocument();
  });

  it('muestra las acciones administrativas al Administrador', async () => {
    const cliente: Cliente = {
      idCliente: 2,
      tipo: 'EMPRESA',
      nombreMostrar: 'Repuestos Centro SRL',
      condicionIva: condicion,
      contacto: { telefono: '3515550000', correo: null, direccion: null },
      persona: null,
      empresa: { cuit: '30123456781', razonSocial: 'Repuestos Centro SRL', personaContacto: 'Carlos' },
      estadoCuenta: 'ACTIVA',
      cuentaCorriente: { idCuentaCorriente: 2, numeroCuenta: 'CC-000002', saldo: 0, estado: 'ACTIVA' },
    };

    renderList('ADMINISTRADOR', cliente);
    expect(await screen.findByTitle('Dar de baja la cuenta')).toBeInTheDocument();
    expect(screen.getByTitle('Debe dar de baja la cuenta primero')).toBeInTheDocument();
  });

  it('habilita una cuenta desde el modal del listado', async () => {
    const cliente: Cliente = {
      idCliente: 3,
      tipo: 'PERSONA',
      nombreMostrar: 'López, Mario',
      condicionIva: condicion,
      contacto: { telefono: null, correo: null, direccion: null },
      persona: { nombre: 'Mario', apellido: 'López', dni: '23456789', cuil: '20234567890' },
      empresa: null,
      estadoCuenta: 'SIN_CUENTA',
      cuentaCorriente: null,
    };
    vi.mocked(api.post).mockResolvedValue({ data: { numeroCuenta: 'CC-000003' } });
    const user = userEvent.setup();
    renderList('EMPLEADO_VENTA', cliente);

    await user.click(await screen.findByTitle('Habilitar cuenta'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Habilitar cuenta' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/cuentas-corrientes', { clienteId: 3 }));
  });
});
