import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CatalogoPage } from './pages/CatalogoPage';
import { FormProductoPage } from './pages/FormProductoPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/catalogo" element={<CatalogoPage />} />
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
