import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CartProvider } from './context/CartContext';
import { CatalogoPage } from './pages/CatalogoPage';
import { ClientesListPage } from './pages/ClientesListPage';
import { CatalogosProductoPage } from './pages/CatalogosProductoPage';
import { CuentasCorrientesPage } from './pages/CuentasCorrientesPage';
import { DetalleDeudaPage } from './pages/DetalleDeudaPage';
import { DevolucionesHistorialPage } from './pages/DevolucionesHistorialPage';
import { FormClientePage } from './pages/FormClientePage';
import { FormProductoPage } from './pages/FormProductoPage';
import { LoginPage } from './pages/LoginPage';
import { PuntoDeVentaPage } from './pages/PuntoDeVentaPage';
import { RegistrarDevolucionPage } from './pages/RegistrarDevolucionPage';
import { VentasHistorialPage } from './pages/VentasHistorialPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/ventas/nueva" element={<PuntoDeVentaPage />} />
            <Route path="/ventas" element={<VentasHistorialPage />} />
            <Route path="/pos" element={<Navigate to="/ventas/nueva" replace />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="/clientes" element={<ClientesListPage />} />
            <Route path="/clientes/nuevo" element={<FormClientePage />} />
            <Route path="/clientes/:id/editar" element={<FormClientePage />} />
            <Route path="/devoluciones/nueva" element={<RegistrarDevolucionPage />} />
            <Route path="/devoluciones" element={<DevolucionesHistorialPage />} />
            <Route path="/cuentas-corrientes" element={<CuentasCorrientesPage />} />
            <Route path="/cuentas-corrientes/:idCliente" element={<DetalleDeudaPage />} />
            <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
              <Route path="/productos/catalogos" element={<CatalogosProductoPage />} />
              <Route path="/productos/nuevo" element={<FormProductoPage />} />
              <Route path="/productos/:id/editar" element={<FormProductoPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/ventas/nueva" replace />} />
      </Routes>
    </CartProvider>
  );
}
