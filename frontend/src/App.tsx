import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CatalogoPage } from './pages/CatalogoPage';
import { ClientesPage } from './pages/ClientesPage';
import { CuentasCorrientesPage } from './pages/CuentasCorrientesPage';
import { DetalleDeudaPage } from './pages/DetalleDeudaPage';
import { FormClientePage } from './pages/FormClientePage';
import { FormProductoPage } from './pages/FormProductoPage';
import { LoginPage } from './pages/LoginPage';
import { RegistrarDevolucionPage } from './pages/RegistrarDevolucionPage';
import { RegistrarVentaPage } from './pages/RegistrarVentaPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<FormClientePage />} />
          <Route path="/clientes/:id/editar" element={<FormClientePage />} />
          <Route path="/ventas/nueva" element={<RegistrarVentaPage />} />
          <Route path="/devoluciones/nueva" element={<RegistrarDevolucionPage />} />
          <Route path="/cuentas-corrientes" element={<CuentasCorrientesPage />} />
          <Route path="/cuentas-corrientes/:idCliente" element={<DetalleDeudaPage />} />
          <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
            <Route path="/productos/nuevo" element={<FormProductoPage />} />
            <Route path="/productos/:id/editar" element={<FormProductoPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/catalogo" replace />} />
    </Routes>
  );
}
