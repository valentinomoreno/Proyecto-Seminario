import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';
import type { Cliente } from '../types/cliente.types';
import type { PaginatedResponse } from '../types/producto.types';
import { formatearMonto } from '../utils/formato';

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConsulta(buscar.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [buscar]);

  useEffect(() => {
    let active = true;
    setCargando(true);
    setError('');
    api.get<PaginatedResponse<Cliente>>('/clientes', { params: { buscar: consulta || undefined, page, limit: 10 } })
      .then(({ data }) => {
        if (active) { setClientes(data.data); setMeta(data.meta); }
      })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [consulta, page, reloadKey]);

  async function eliminar(cliente: Cliente) {
    if (!window.confirm(`¿Dar de baja al cliente "${cliente.apellido}, ${cliente.nombre}"?`)) return;
    try {
      await api.delete(`/clientes/${cliente.idCliente}`);
      if (clientes.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((current) => current + 1);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  return (
    <div className="clientes-datta-view">
      {/* PAGE HEADER / BREADCRUMB */}
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">Clientes</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Clientes</li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/clientes/nuevo" className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm">
                <i className="ti ti-user-plus" />
                <span>Nuevo cliente</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="ti ti-alert-circle fs-5" />
          <div>{error}</div>
        </div>
      )}

      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="input-group" style={{ maxWidth: '480px' }}>
            <span className="input-group-text bg-light border-end-0 text-muted">
              <i className="ti ti-search" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Buscar por nombre, apellido, DNI/CUIT o email…"
              aria-label="Buscar clientes"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
            {buscar && (
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setBuscar('')}
                aria-label="Limpiar búsqueda"
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          <span className="badge bg-light-primary text-primary px-3 py-2 fs-6 fw-semibold">
            {meta.total} {meta.total === 1 ? 'cliente registrado' : 'clientes registrados'}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datta-table">
              <thead className="table-light">
                <tr>
                  <th>Cliente</th>
                  <th>DNI / CUIT</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Saldo cuenta corriente</th>
                  <th style={{ width: '170px' }} className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      Cargando clientes…
                    </td>
                  </tr>
                )}
                {!cargando && !clientes.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <i className="ti ti-users fs-1 d-block mb-2 text-secondary" />
                      No se encontraron clientes.
                    </td>
                  </tr>
                )}
                {!cargando && clientes.map((cliente) => {
                  const saldo = Number(cliente.saldoCuentaCorriente ?? 0);
                  return (
                    <tr key={cliente.idCliente}>
                      <td>
                        <div className="fw-bold text-dark">{cliente.apellido}, {cliente.nombre}</div>
                        <small className="text-muted">Cliente #{cliente.idCliente}</small>
                      </td>
                      <td>
                        <span className="badge bg-light-secondary text-secondary font-monospace">
                          {cliente.dniCuit}
                        </span>
                      </td>
                      <td>
                        <div className="small text-dark">{cliente.email}</div>
                        <small className="text-muted">{cliente.telefono || 'Sin teléfono'}</small>
                      </td>
                      <td>
                        <span className={`badge ${cliente.activo ? 'bg-light-success text-success' : 'bg-light-danger text-danger'}`}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className={`fw-bold font-monospace ${saldo > 0 ? 'text-danger' : 'text-success'}`}>
                        $ {formatearMonto(saldo)}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link
                            to={`/cuentas-corrientes/${cliente.idCliente}`}
                            className="btn btn-outline-info"
                            title="Ver detalle de deuda"
                          >
                            <i className="ti ti-report-money" />
                          </Link>
                          <Link
                            to={`/clientes/${cliente.idCliente}/editar`}
                            className="btn btn-outline-primary"
                            title="Editar cliente"
                          >
                            <i className="ti ti-edit" />
                          </Link>
                          {esAdmin && (
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => void eliminar(cliente)}
                              title="Dar de baja"
                            >
                              <i className="ti ti-trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {meta.totalPages > 1 && (
          <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Página {page} de {meta.totalPages} ({meta.total} total)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
