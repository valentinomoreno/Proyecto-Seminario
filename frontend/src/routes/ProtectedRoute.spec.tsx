import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TOKEN_KEY, USER_KEY } from '../api/axios.instance';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<h1>Acceso</h1>} />
          <Route path="/catalogo" element={<h1>Catálogo</h1>} />
          <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
            <Route path="/productos/nuevo" element={<h1>Nuevo producto</h1>} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/protegida" element={<h1>Contenido protegido</h1>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => sessionStorage.clear());

  it('redirige al login cuando no existe sesión', () => {
    renderRoutes('/protegida');
    expect(screen.getByRole('heading', { name: 'Acceso' })).toBeInTheDocument();
  });

  it('impide que un empleado acceda a una ruta administrativa', () => {
    sessionStorage.setItem(TOKEN_KEY, 'token');
    sessionStorage.setItem(USER_KEY, JSON.stringify({ idUsuario: 2, nombre: 'empleado', rol: 'EMPLEADO_VENTA', idEmpleado: 2 }));
    renderRoutes('/productos/nuevo');
    expect(screen.getByRole('heading', { name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nuevo producto' })).not.toBeInTheDocument();
  });

  it('permite que un administrador acceda a una ruta administrativa', () => {
    sessionStorage.setItem(TOKEN_KEY, 'token');
    sessionStorage.setItem(USER_KEY, JSON.stringify({ idUsuario: 1, nombre: 'admin', rol: 'ADMINISTRADOR', idEmpleado: 1 }));
    renderRoutes('/productos/nuevo');
    expect(screen.getByRole('heading', { name: 'Nuevo producto' })).toBeInTheDocument();
  });
});
