import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/auth-context';
import { AppLayout } from './AppLayout';

const auth: AuthContextValue = {
  autenticado: true,
  usuario: { idUsuario: 1, nombre: 'Ana', rol: 'ADMINISTRADOR', idEmpleado: 1 },
  login: () => Promise.reject(new Error('No utilizado')),
  logout: vi.fn(),
};

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/catalogo']}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/catalogo" element={<h1>Catálogo</h1>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('colapsa el menú lateral desde el botón de tres líneas', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout();
    const sidebar = container.querySelector('.pc-sidebar');

    expect(sidebar).not.toHaveClass('pc-sidebar-hide');
    await user.click(screen.getByTitle('Colapsar menú'));
    expect(sidebar).toHaveClass('pc-sidebar-hide');
    await user.click(screen.getByTitle('Expandir menú'));
    expect(sidebar).not.toHaveClass('pc-sidebar-hide');
  });

  it('muestra Nuevo Repuesto sin el badge Admin redundante', () => {
    renderLayout();
    expect(screen.getByText('Nuevo Repuesto')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('ofrece una sola entrada de nueva venta y el acceso al historial', () => {
    renderLayout();
    expect(screen.queryByText('Punto de Venta (POS)')).not.toBeInTheDocument();
    expect(screen.getByText('Nueva Venta')).toBeInTheDocument();
    expect(screen.getByText('Historial de Ventas')).toBeInTheDocument();
  });
});
