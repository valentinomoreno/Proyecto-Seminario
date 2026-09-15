import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CartProvider } from './context/CartContext';
import { CatalogoPage } from './pages/CatalogoPage';
import { FormProductoPage } from './pages/FormProductoPage';
import { LoginPage } from './pages/LoginPage';
import { PuntoDeVentaPage } from './pages/PuntoDeVentaPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/pos" element={<PuntoDeVentaPage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route element={<ProtectedRoute roles={['ADMINISTRADOR']} />}>
              <Route path="/productos/nuevo" element={<FormProductoPage />} />
              <Route path="/productos/:id/editar" element={<FormProductoPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </CartProvider>
  );
}
