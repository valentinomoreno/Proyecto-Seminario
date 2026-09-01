import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export function AppLayout() {
  const { usuario, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const inicial = usuario?.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U';
  const rolLabel = esAdmin ? 'Administrador' : 'Vendedor';

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleMobileNav = () => setMobileNavOpen(!mobileNavOpen);
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className={`pc-layout ${sidebarCollapsed ? 'pc-sidebar-hide' : ''}`}>
      {/* SIDEBAR / DRAWER DE DATTA ABLE */}
      <nav className={`pc-sidebar ${mobileNavOpen ? 'mob-sidebar-active' : ''}`}>
        <div className="navbar-wrapper">
          {/* LOGO HEADER */}
          <div className="m-header">
            <Link to="/catalogo" className="b-brand">
              <span className="brand-mark-datta">AP</span>
              <div className="brand-text-datta">
                <span className="brand-name">Autopartes</span>
                <span className="brand-sub">Gestión integral</span>
              </div>
            </Link>
            <button
              type="button"
              className="btn-sidebar-collapse d-none d-lg-flex"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <i className="ti ti-menu-2" />
            </button>
          </div>

          {/* MENU LIST */}
          <div className="navbar-content">
            <ul className="pc-navbar">
              <li className="pc-item pc-caption">
                <label>INVENTARIO & VENTAS</label>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/catalogo"
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon">
                    <i className="ti ti-box" />
                  </span>
                  <span className="pc-mtext">Catálogo de Repuestos</span>
                </NavLink>
              </li>

              {esAdmin && (
                <li className="pc-item">
                  <NavLink
                    to="/productos/nuevo"
                    className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                    onClick={closeMobileNav}
                  >
                    <span className="pc-micon">
                      <i className="ti ti-plus" />
                    </span>
                    <span className="pc-mtext">Nuevo Repuesto</span>
                    <span className="pc-badge">Admin</span>
                  </NavLink>
                </li>
              )}

              <li className="pc-item pc-caption">
                <label>SISTEMA & CUENTA</label>
              </li>

              <li className="pc-item">
                <button
                  type="button"
                  className="pc-link btn-link-logout"
                  onClick={logout}
                >
                  <span className="pc-micon text-danger">
                    <i className="ti ti-logout" />
                  </span>
                  <span className="pc-mtext text-danger">Cerrar sesión</span>
                </button>
              </li>
            </ul>

            {/* USER MINI-CARD EN SIDEBAR */}
            <div className="sidebar-user-card">
              <div className={`avatar-initial ${esAdmin ? 'avatar-admin' : 'avatar-seller'}`}>
                {inicial}
              </div>
              <div className="sidebar-user-info">
                <strong>{usuario?.nombre}</strong>
                <span className={`badge-role-datta ${esAdmin ? 'role-admin' : 'role-seller'}`}>
                  {esAdmin ? '👑 ' : '👤 '}{rolLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* OVERLAY PARA MÓVILES */}
      {mobileNavOpen && (
        <div className="pc-menu-overlay" onClick={closeMobileNav} />
      )}

      {/* TOP HEADER DE DATTA ABLE */}
      <header className="pc-header">
        <div className="header-wrapper">
          <div className="me-auto pc-mob-drp d-flex align-items-center gap-2">
            <button
              type="button"
              className="pc-head-link d-lg-none"
              onClick={toggleMobileNav}
              aria-label="Abrir menú"
            >
              <i className="ti ti-menu-2" />
            </button>
            <div className="header-title-block d-none d-md-block">
              <h5 className="mb-0 fw-bold">Sistema de Repuestos</h5>
            </div>
          </div>

          <div className="ms-auto d-flex align-items-center gap-3">
            {/* HUD USER BADGE */}
            <div className="header-user-hud">
              <div className={`avatar-initial-sm ${esAdmin ? 'avatar-admin' : 'avatar-seller'}`}>
                {inicial}
              </div>
              <div className="d-none d-sm-flex flex-column text-end">
                <span className="user-name-text fw-bold">{usuario?.nombre}</span>
                <span className={`badge-role-pill ${esAdmin ? 'role-admin' : 'role-seller'}`}>
                  {esAdmin ? '👑 ' : '👤 '}{rolLabel}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 ms-2"
                onClick={logout}
                title="Cerrar sesión"
              >
                <i className="ti ti-logout" />
                <span className="d-none d-sm-inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="pc-container">
        <div className="pc-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
