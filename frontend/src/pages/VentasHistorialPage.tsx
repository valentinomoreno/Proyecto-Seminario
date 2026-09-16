import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axios.instance';
import { ventasApi } from '../api/ventas.service';
import { ModalComprobante } from '../components/ModalComprobante';
import type { VentaResponse } from '../types/venta.types';
import { nombreCliente } from '../utils/cliente';
import { formatearFechaHora, formatearMonto } from '../utils/formato';

const LIMITE_POR_PAGINA = 15;

export function VentasHistorialPage() {
  const [ventas, setVentas] = useState<VentaResponse[]>([]);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: LIMITE_POR_PAGINA, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaResponse | null>(null);

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
    ventasApi.getVentas(consulta || undefined, page, LIMITE_POR_PAGINA)
      .then((response) => {
        if (!active) return;
        setVentas(response.data);
        setMeta(response.meta);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setCargando(false);
      });
    return () => { active = false; };
  }, [consulta, page]);

  async function verDetalle(idVenta: number) {
    setError('');
    try {
      setVentaSeleccionada(await ventasApi.getVenta(idVenta));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <div className="ventas-historial-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">Historial de Ventas</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Historial</li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/ventas/nueva" className="btn btn-primary d-inline-flex align-items-center gap-2">
                <i className="ti ti-shopping-cart-plus" />
                <span>Nueva venta</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <i className="ti ti-alert-circle" />
          <div>{error}</div>
        </div>
      )}

      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="input-group" style={{ maxWidth: '520px' }}>
            <span className="input-group-text bg-light border-end-0 text-muted">
              <i className="ti ti-search" />
            </span>
            <input
              type="search"
              className="form-control border-start-0 ps-0"
              aria-label="Buscar ventas"
              placeholder="Buscar por venta, cliente, DNI, CUIL o CUIT…"
              value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
            />
          </div>
          <span className="badge bg-light-primary text-primary px-3 py-2 fs-6 fw-semibold">
            {meta.total} {meta.total === 1 ? 'venta' : 'ventas'}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datta-table">
              <thead className="table-light">
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Condición</th>
                  <th className="text-end">Total</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <span className="spinner-border spinner-border-sm text-primary me-2" />
                      Cargando ventas…
                    </td>
                  </tr>
                )}
                {!cargando && ventas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <i className="ti ti-receipt-off fs-1 d-block mb-2" />
                      {consulta ? 'No se encontraron ventas para la búsqueda.' : 'Todavía no hay ventas registradas.'}
                    </td>
                  </tr>
                )}
                {!cargando && ventas.map((venta) => (
                  <tr key={venta.idVenta}>
                    <td>
                      <div className="fw-bold font-monospace">{venta.numeroVenta}</div>
                      <span className={`badge ${venta.estado === 'COMPLETADA' ? 'bg-light-success text-success' : 'bg-light-danger text-danger'}`}>
                        {venta.estado === 'COMPLETADA' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="small text-muted">{formatearFechaHora(venta.fecha)}</td>
                    <td className="fw-semibold">{nombreCliente(venta.cliente)}</td>
                    <td>
                      <span className={`badge ${venta.modalidadPago === 'CUENTA_CORRIENTE' ? 'bg-light-warning text-warning' : 'bg-light-primary text-primary'}`}>
                        {venta.modalidadPago === 'CUENTA_CORRIENTE' ? 'Cuenta corriente' : 'Contado'}
                      </span>
                    </td>
                    <td className="text-end fw-bold font-monospace">$ {formatearMonto(venta.total)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        onClick={() => void verDetalle(venta.idVenta)}
                      >
                        <i className="ti ti-eye" />
                        <span>Ver detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {meta.totalPages > 1 && (
          <div className="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
            <span className="small text-muted">Página {meta.page} de {meta.totalPages} ({meta.total} total)</span>
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((actual) => actual - 1)}>
                Anterior
              </button>
              <button type="button" className="btn btn-outline-secondary" disabled={page >= meta.totalPages} onClick={() => setPage((actual) => actual + 1)}>
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {ventaSeleccionada && (
        <ModalComprobante
          venta={ventaSeleccionada}
          modoConsulta
          onNuevaVenta={() => setVentaSeleccionada(null)}
        />
      )}
    </div>
  );
}
