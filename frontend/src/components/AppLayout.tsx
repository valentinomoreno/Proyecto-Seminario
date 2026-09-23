import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/ThemeContext';

export function AppLayout() {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const rolLabel = esAdmin ? 'Administrador' : 'Vendedor';

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleMobileNav = () => setMobileNavOpen(!mobileNavOpen);
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="pc-layout">
      {/* SIDEBAR MODERNA */}
      <nav className={`pc-sidebar modern-sidebar ${sidebarCollapsed ? 'pc-sidebar-hide' : ''} ${mobileNavOpen ? 'mob-sidebar-active' : ''}`}>
        <div className="navbar-wrapper">
          {/* LOGO HEADER */}
          <div className="m-header">
            <Link to={esAdmin ? '/dashboard' : '/ventas/nueva'} className="b-brand" onClick={closeMobileNav}>
              <div className="brand-text-datta ms-0">
                <span className="brand-name">Autopartes</span>
                <span className="brand-sub">Gestión integral</span>
              </div>
            </Link>
            <button
              type="button"
              className="btn-sidebar-collapse d-none d-lg-flex"
              onClick={toggleSidebar}
              title="Colapsar menú"
              aria-label="Colapsar menú"
            >
              <i className="ti ti-menu-2" />
            </button>
            <button
              type="button"
              className="btn-sidebar-close d-lg-none"
              onClick={closeMobileNav}
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {/* MENU LIST CON SECCIONES AGRUPADAS */}
          <div className="navbar-content">
            <ul className="pc-navbar">
              {/* GRUPO 1: OPERACIONES */}
              <li className="pc-item pc-caption">
                <label>OPERACIONES</label>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/catalogo"
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-box" /></span>
                  <span className="pc-mtext">Catálogo de Repuestos</span>
                </NavLink>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/clientes"
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-users" /></span>
                  <span className="pc-mtext">Clientes</span>
                </NavLink>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/ventas/nueva"
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-shopping-cart-plus" /></span>
                  <span className="pc-mtext">Nueva Venta</span>
                </NavLink>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/ventas"
                  end
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-history" /></span>
                  <span className="pc-mtext">Historial de Ventas</span>
                </NavLink>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/devoluciones/nueva"
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-arrow-back-up" /></span>
                  <span className="pc-mtext">Nueva Devolución</span>
                </NavLink>
              </li>

              <li className="pc-item">
                <NavLink
                  to="/devoluciones"
                  end
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-rotate-2" /></span>
                  <span className="pc-mtext">Historial de Devoluciones</span>
                </NavLink>
              </li>

              {esAdmin && (
                <>
                  <li className="pc-item">
                    <NavLink
                      to="/productos/nuevo"
                      className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                      onClick={closeMobileNav}
                    >
                      <span className="pc-micon"><i className="ti ti-plus" /></span>
                      <span className="pc-mtext">Nuevo Repuesto</span>
                    </NavLink>
                  </li>
                  <li className="pc-item">
                    <NavLink
                      to="/productos/catalogos"
                      className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                      onClick={closeMobileNav}
                    >
                      <span className="pc-micon"><i className="ti ti-tags" /></span>
                      <span className="pc-mtext">Categorías y Marcas</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* GRUPO 2: REPORTES */}
              <li className="pc-item pc-caption">
                <label>REPORTES</label>
              </li>

              {esAdmin && (
                <li className="pc-item">
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                    onClick={closeMobileNav}
                  >
                    <span className="pc-micon"><i className="ti ti-layout-dashboard" /></span>
                    <span className="pc-mtext">Dashboard</span>
                  </NavLink>
                </li>
              )}

              {esAdmin && (
                <li className="pc-item">
                  <NavLink
                    to="/stock/alertas"
                    className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                    onClick={closeMobileNav}
                  >
                    <span className="pc-micon"><i className="ti ti-alert-triangle" /></span>
                    <span className="pc-mtext">Alertas de Stock</span>
                  </NavLink>
                </li>
              )}

              <li className="pc-item">
                <NavLink
                  to="/cuentas-corrientes"
                  className={({ isActive }) => `pc-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileNav}
                >
                  <span className="pc-micon"><i className="ti ti-report-money" /></span>
                  <span className="pc-mtext">Cuentas Corrientes</span>
                </NavLink>
              </li>

              {/* GRUPO 3: SISTEMA */}
              <li className="pc-item pc-caption">
                <label>SISTEMA</label>
              </li>

              <li className="pc-item">
                <button
                  type="button"
                  className="pc-link btn-link-action"
                  onClick={() => setConfigOpen(!configOpen)}
                >
                  <span className="pc-micon"><i className="ti ti-settings" /></span>
                  <span className="pc-mtext">Configuración</span>
                </button>
              </li>

              <li className="pc-item">
                <button
                  type="button"
                  className="pc-link btn-link-logout"
                  onClick={logout}
                >
                  <span className="pc-micon text-danger"><i className="ti ti-logout" /></span>
                  <span className="pc-mtext text-danger">Cerrar sesión</span>
                </button>
              </li>
            </ul>

            {/* USUARIO EN SIDEBAR (LIMPIO, SIN FOTO NI CORONITA) */}
            <div className="sidebar-user-clean">
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">{usuario?.nombre}</span>
                <span className="sidebar-user-role">{rolLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* OVERLAY PARA MÓVILES */}
      {mobileNavOpen && (
        <div className="pc-menu-overlay" onClick={closeMobileNav} />
      )}

      {/* HEADER LIMPIO CON IDENTIDAD */}
      <header className="pc-header modern-header">
        <div className="header-wrapper">
          <div className="me-auto pc-mob-drp d-flex align-items-center gap-2">
            {sidebarCollapsed && (
              <button
                type="button"
                className="pc-head-link d-none d-lg-flex"
                onClick={toggleSidebar}
                aria-label="Expandir menú"
                title="Expandir menú"
              >
                <i className="ti ti-menu-2" />
              </button>
            )}
            <button
              type="button"
              className="pc-head-link d-lg-none"
              onClick={toggleMobileNav}
              aria-label="Abrir menú"
            >
              <i className="ti ti-menu-2" />
            </button>
            <div className="header-brand-clean d-flex align-items-center">
              <span className="header-brand-name fw-semibold">Sistema de Repuestos</span>
            </div>
          </div>
        </div>
      </header>

      {/* MODAL FLOTANTE DE CONFIGURACIÓN */}
      {configOpen && (
        <div className="modal-backdrop-custom" onClick={() => setConfigOpen(false)}>
          <div className="modal-card-custom shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="config-popover-header">
              <span className="fw-bold">Configuración</span>
              <button
                type="button"
                className="btn-close btn-close-sm"
                onClick={() => setConfigOpen(false)}
                aria-label="Cerrar"
              />
            </div>

            <div className="config-popover-body">
              {/* OPCIÓN 1: TEMA CLARO / OSCURO */}
              <div className="config-option-row">
                <div className="d-flex flex-column">
                  <span className="config-option-title">Tema visual</span>
                  <small className="text-muted">
                    {theme === 'dark' ? 'Modo Oscuro activado' : 'Modo Claro activado'}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                  onClick={toggleTheme}
                >
                  <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
                  <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
                </button>
              </div>

              <div className="config-divider" />

              {/* OPCIÓN 2: DETALLES DE SESIÓN */}
              <div className="config-user-summary">
                <label className="text-muted small fw-semibold text-uppercase mb-1 d-block">
                  Datos de la sesión
                </label>
                <div className="d-flex justify-content-between small py-1">
                  <span className="text-muted">Usuario:</span>
                  <span className="fw-medium">{usuario?.nombre}</span>
                </div>
                <div className="d-flex justify-content-between small py-1">
                  <span className="text-muted">Rol:</span>
                  <span className="fw-medium">{rolLabel}</span>
                </div>
                <div className="d-flex justify-content-between small py-1">
                  <span className="text-muted">Identificador:</span>
                  <span className="fw-medium font-monospace">#{usuario?.idEmpleado ?? usuario?.idUsuario ?? '1'}</span>
                </div>
              </div>

              <div className="config-divider" />

              {/* ATAJOS RÁPIDOS */}
              <div className="d-flex flex-column gap-1">
                <label className="text-muted small fw-semibold text-uppercase mb-1">
                  Accesos rápidos
                </label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm flex-fill ${theme === 'light' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setTheme('light')}
                  >
                    <i className="ti ti-sun me-1" /> Día
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm flex-fill ${theme === 'dark' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setTheme('dark')}
                  >
                    <i className="ti ti-moon me-1" /> Noche
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <div className="pc-container">
        <div className="pc-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
