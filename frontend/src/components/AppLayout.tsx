import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export function AppLayout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/catalogo">
          <span className="brand-mark">AP</span>
          <span><strong>Autopartes</strong><small>Gestión integral</small></span>
        </Link>
        <div className="user-menu">
          <span><strong>{usuario?.nombre}</strong><small>{usuario?.rol.replace('_', ' ')}</small></span>
          <button className="button button-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      <main className="page-container"><Outlet /></main>
    </div>
  );
}
