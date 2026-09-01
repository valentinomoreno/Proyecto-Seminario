import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';
import type { PaginatedResponse, Producto } from '../types/producto.types';

export function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [fotoModal, setFotoModal] = useState<{ url: string; nombre: string; sku: string } | null>(null);

  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const backendBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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
    api.get<PaginatedResponse<Producto>>('/productos', { params: { buscar: consulta || undefined, page, limit: 10 } })
      .then(({ data }) => {
        if (active) { setProductos(data.data); setMeta(data.meta); }
      })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [consulta, page, reloadKey]);

  async function eliminar(producto: Producto) {
    if (!window.confirm(`¿Dar de baja el producto "${producto.nombre}" (${producto.sku})?`)) return;
    try {
      await api.delete(`/productos/${producto.idProducto}`);
      if (productos.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((current) => current + 1);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  function getFullImageUrl(relativeOrAbsolute?: string | null): string | null {
    if (!relativeOrAbsolute) return null;
    return relativeOrAbsolute.startsWith('http') ? relativeOrAbsolute : `${backendBaseUrl}${relativeOrAbsolute}`;
  }

  return (
    <div className="catalogo-datta-view">
      {/* PAGE HEADER / BREADCRUMB */}
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">Catálogo de Repuestos</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Inventario</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Catálogo General</li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              {esAdmin && (
                <Link to="/productos/nuevo" className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm">
                  <i className="ti ti-plus" />
                  <span>Nuevo repuesto</span>
                </Link>
              )}
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

      {/* MAIN CARD */}
      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* SEARCH BAR DATTA ABLE */}
          <div className="input-group" style={{ maxWidth: '480px' }}>
            <span className="input-group-text bg-light border-end-0 text-muted">
              <i className="ti ti-search" />
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Buscar por código, nombre o descripción…"
              aria-label="Buscar productos"
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
            {meta.total} {meta.total === 1 ? 'repuesto registrado' : 'repuestos registrados'}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datta-table">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '64px' }} className="text-center">Foto</th>
                  <th>Código / Repuesto</th>
                  <th>Categoría / Marca</th>
                  <th>Stock</th>
                  <th>Precio unitario</th>
                  <th>Ubicación física</th>
                  {esAdmin && <th style={{ width: '130px' }} className="text-end">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={esAdmin ? 7 : 6} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      Cargando catálogo de repuestos…
                    </td>
                  </tr>
                )}
                {!cargando && !productos.length && (
                  <tr>
                    <td colSpan={esAdmin ? 7 : 6} className="text-center py-5 text-muted">
                      <i className="ti ti-package-off fs-1 d-block mb-2 text-secondary" />
                      No se encontraron productos en el inventario.
                    </td>
                  </tr>
                )}
                {!cargando && productos.map((producto) => {
                  const fotoUrl = getFullImageUrl(producto.imagenUrl);
                  return (
                    <tr key={producto.idProducto}>
                      <td className="text-center">
                        {fotoUrl ? (
                          <button
                            type="button"
                            className="btn p-0 border rounded-3 overflow-hidden shadow-sm datta-photo-thumb"
                            onClick={() => setFotoModal({ url: fotoUrl, nombre: producto.nombre, sku: producto.sku })}
                            title="Ver foto ampliada"
                          >
                            <img src={fotoUrl} alt={producto.nombre} className="img-fluid" />
                          </button>
                        ) : (
                          <div className="datta-photo-placeholder" title="Sin foto">
                            <i className="ti ti-photo" />
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light-primary text-primary font-monospace mb-1">
                          {producto.sku}
                        </span>
                        <div className="fw-bold text-dark">{producto.nombre}</div>
                        {producto.descripcion && (
                          <small className="text-muted text-truncate d-block" style={{ maxWidth: '300px' }}>
                            {producto.descripcion}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light-secondary text-secondary fw-semibold">
                          {producto.categoria.nombre}
                        </span>
                        <small className="d-block text-muted mt-1">{producto.marca.nombre}</small>
                      </td>
                      <td>
                        <span className={`badge ${
                          producto.stock === 0
                            ? 'bg-light-danger text-danger'
                            : producto.stock < 5
                            ? 'bg-light-warning text-warning'
                            : 'bg-light-success text-success'
                        }`}>
                          {producto.stock} unidades
                        </span>
                      </td>
                      <td className="fw-bold text-dark font-monospace">
                        $ {producto.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">{producto.ubicacion.deposito.nombre}</div>
                        <small className="text-muted">
                          Sector {producto.ubicacion.sector.nombre} · Estante {producto.ubicacion.estante.codigo}
                        </small>
                      </td>
                      {esAdmin && (
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/productos/${producto.idProducto}/editar`}
                              className="btn btn-outline-primary"
                              title="Editar producto"
                            >
                              <i className="ti ti-edit" />
                            </Link>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => void eliminar(producto)}
                              title="Dar de baja"
                            >
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </td>
                      )}
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

      {/* MODAL LIGHTBOX FOTO AMPLIADA */}
      {fotoModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom">
                <div>
                  <span className="badge bg-light-primary text-primary font-monospace mb-1">{fotoModal.sku}</span>
                  <h5 className="modal-title fw-bold m-0">{fotoModal.nombre}</h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setFotoModal(null)} aria-label="Cerrar" />
              </div>
              <div className="modal-body text-center bg-light p-4">
                <img src={fotoModal.url} alt={fotoModal.nombre} className="img-fluid rounded-3 shadow-sm" style={{ maxHeight: '420px', objectFit: 'contain' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
