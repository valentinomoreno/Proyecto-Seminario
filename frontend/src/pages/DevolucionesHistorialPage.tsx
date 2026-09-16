import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { PaginatedResponse } from '../types/cliente.types';
import type { Devolucion } from '../types/devolucion.types';
import { documentoCliente, nombreCliente } from '../utils/cliente';
import { formatearFechaHora, formatearMonto } from '../utils/formato';

const LIMITE_POR_PAGINA = 15;

export function DevolucionesHistorialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clienteId = Number(searchParams.get('clienteId')) || undefined;
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: LIMITE_POR_PAGINA, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState<Devolucion | null>(null);

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
    api.get<PaginatedResponse<Devolucion>>('/devoluciones', {
      params: { buscar: consulta || undefined, clienteId, page, limit: LIMITE_POR_PAGINA },
    })
      .then(({ data }) => {
        if (!active) return;
        setDevoluciones(data.data);
        setMeta(data.meta);
      })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [clienteId, consulta, page]);

  return (
    <div className="devoluciones-historial-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h4 className="mb-1 fw-bold">Historial de Devoluciones</h4>
              <p className="text-muted mb-0">Consultá todas las devoluciones y el cliente asociado a cada operación.</p>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/devoluciones/nueva" className="btn btn-primary d-inline-flex align-items-center gap-2">
                <i className="ti ti-arrow-back-up" />
                <span>Nueva devolución</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {clienteId && (
        <div className="alert alert-info d-flex justify-content-between align-items-center gap-3" role="status">
          <span><i className="ti ti-filter me-2" />Mostrando únicamente las devoluciones del cliente seleccionado.</span>
          <button type="button" className="btn btn-sm btn-outline-info" onClick={() => setSearchParams({})}>Ver todos</button>
        </div>
      )}

      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="input-group" style={{ maxWidth: 600 }}>
            <span className="input-group-text bg-light border-end-0 text-muted"><i className="ti ti-search" /></span>
            <input
              type="search"
              className="form-control border-start-0 ps-0"
              aria-label="Buscar devoluciones"
              placeholder="Buscar por cliente, documento, venta, nota de crédito o repuesto…"
              value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
            />
          </div>
          <span className="badge bg-light-primary text-primary px-3 py-2 fs-6 fw-semibold">
            {meta.total} {meta.total === 1 ? 'devolución' : 'devoluciones'}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datta-table">
              <thead className="table-light">
                <tr>
                  <th>Fecha / Cliente</th>
                  <th>Venta</th>
                  <th>Repuesto</th>
                  <th>Nota de crédito</th>
                  <th className="text-end">Importe</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && <tr><td colSpan={6} className="text-center py-5 text-muted"><span className="spinner-border spinner-border-sm me-2" />Cargando devoluciones…</td></tr>}
                {!cargando && devoluciones.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-5 text-muted"><i className="ti ti-receipt-off fs-1 d-block mb-2" />{consulta ? 'No se encontraron devoluciones.' : 'Todavía no hay devoluciones registradas.'}</td></tr>
                )}
                {!cargando && devoluciones.map((devolucion) => (
                  <tr key={devolucion.idDevolucion}>
                    <td>
                      <div className="small text-muted">{formatearFechaHora(devolucion.fecha)}</div>
                      <Link className="fw-bold text-decoration-none" to={`/devoluciones?clienteId=${devolucion.cliente.idCliente}`}>
                        {nombreCliente(devolucion.cliente)}
                      </Link>
                      <small className="text-muted font-monospace">{documentoCliente(devolucion.cliente) ?? 'Sin documento'}</small>
                    </td>
                    <td><span className="fw-semibold font-monospace">{devolucion.venta.numeroVenta}</span></td>
                    <td>
                      <div className="fw-semibold">{devolucion.producto.nombre}</div>
                      <small className="text-muted font-monospace">{devolucion.producto.sku} · {devolucion.cantidadDevuelta} u.</small>
                    </td>
                    <td>
                      <div className="fw-semibold font-monospace">{devolucion.notaCredito.numero}</div>
                      <span className="badge bg-light-success text-success">{devolucion.notaCredito.estado}</span>
                    </td>
                    <td className="text-end fw-bold font-monospace text-success">$ {formatearMonto(devolucion.montoDevuelto)}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSeleccionada(devolucion)}>
                        <i className="ti ti-eye me-1" />Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {meta.totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <span className="small text-muted">Página {meta.page} de {meta.totalPages}</span>
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((actual) => actual - 1)}>Anterior</button>
              <button type="button" className="btn btn-outline-secondary" disabled={page >= meta.totalPages} onClick={() => setPage((actual) => actual + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {seleccionada && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.58)' }} role="dialog" aria-modal="true" aria-labelledby="detalle-devolucion-title">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="detalle-devolucion-title">Detalle de devolución #{seleccionada.idDevolucion}</h5>
                <button type="button" className="btn-close" onClick={() => setSeleccionada(null)} aria-label="Cerrar" />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><span className="small text-muted d-block">Cliente</span><strong>{nombreCliente(seleccionada.cliente)}</strong><div className="small">{documentoCliente(seleccionada.cliente)}</div></div>
                  <div className="col-md-6"><span className="small text-muted d-block">Venta / Nota de crédito</span><strong className="font-monospace">{seleccionada.venta.numeroVenta} / {seleccionada.notaCredito.numero}</strong></div>
                  <div className="col-md-6"><span className="small text-muted d-block">Producto</span><strong>{seleccionada.producto.nombre}</strong><div className="small font-monospace">{seleccionada.producto.sku}</div></div>
                  <div className="col-md-3"><span className="small text-muted d-block">Cantidad</span><strong>{seleccionada.cantidadDevuelta}</strong></div>
                  <div className="col-md-3"><span className="small text-muted d-block">Importe</span><strong className="text-success">$ {formatearMonto(seleccionada.montoDevuelto)}</strong></div>
                  <div className="col-12"><span className="small text-muted d-block">Motivo</span><div>{seleccionada.motivo}</div></div>
                  {seleccionada.observaciones && <div className="col-12"><span className="small text-muted d-block">Observaciones</span><div>{seleccionada.observaciones}</div></div>}
                  <div className="col-12"><span className={`badge ${seleccionada.aptoReingreso ? 'bg-light-success text-success' : 'bg-light-warning text-warning'}`}>{seleccionada.aptoReingreso ? 'Reingresó al stock' : 'No apto para reingreso'}</span></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setSeleccionada(null)}>Cerrar</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
