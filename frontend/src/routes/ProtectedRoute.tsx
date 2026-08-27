import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import type { Rol } from '../types/auth.types';

export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { autenticado, usuario } = useAuth();
  const location = useLocation();

  if (!autenticado) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && usuario && !roles.includes(usuario.rol)) return <Navigate to="/catalogo" replace />;
  return <Outlet />;
}
