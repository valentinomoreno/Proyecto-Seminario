import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { PaginatedResponse } from '../types/cliente.types';
import type { CuentaCorriente } from '../types/cuenta-corriente.types';
import { correoCliente, documentoCliente, nombreCliente } from '../utils/cliente';
import { formatearFecha, formatearMonto } from '../utils/formato';

const LIMITE_POR_PAGINA = 10;

export function CuentasCorrientesPage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: LIMITE_POR_PAGINA, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setCargando(true);
    setError('');
    api.get<PaginatedResponse<CuentaCorriente>>('/cuentas-corrientes', {
      params: { page, limit: LIMITE_POR_PAGINA },
    })
      .then(({ data }) => { if (active) { setCuentas(data.data); setMeta(data.meta); } })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [page]);

  const deudaTotal = useMemo(
    () => cuentas.reduce((acumulado, cuenta) => acumulado + Math.max(Number(cuenta.deuda ?? 0), 0), 0),
    [cuentas],
  );

  return (
    <div className="cuentas-corrientes-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">Cuentas Corrientes</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Cuentas corrientes</li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <span
                className="badge bg-light-danger text-danger px-3 py-2 fs-6 fw-semibold"
                title="Suma de los saldos deudores de las cuentas listadas en esta página."
              >
                Deuda listada: $ {formatearMonto(deudaTotal)}
              </span>
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
          <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
            <i className="ti ti-report-money text-primary" />
            <span>Saldos por cliente</span>
          </h6>
          <span className="badge bg-light-primary text-primary px-3 py-2 fs-6 fw-semibold">
            {meta.total} {meta.total === 1 ? 'cuenta' : 'cuentas'}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datta-table">
              <thead className="table-light">
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Último movimiento</th>
                  <th>Deuda / Saldo a favor</th>
                  <th style={{ width: '140px' }} className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      Cargando cuentas corrientes…
                    </td>
                  </tr>
                )}
                {!cargando && !cuentas.length && (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      <i className="ti ti-wallet-off fs-1 d-block mb-2 text-secondary" />
                      No hay cuentas corrientes registradas.
                    </td>
                  </tr>
                )}
                {!cargando && cuentas.map((cuenta) => {
                  const deuda = Number(cuenta.deuda ?? 0);
                  const saldoFavor = Number(cuenta.saldoFavor ?? cuenta.saldo ?? 0);
                  const conDeuda = deuda > 0;
                  return (
                    <tr key={cuenta.idCuentaCorriente}>
                      <td>
                        <span className={`badge mb-1 ${cuenta.cliente.tipo === 'PERSONA' ? 'bg-light-primary text-primary' : 'bg-light-secondary text-secondary'}`}>
                          {cuenta.cliente.tipo === 'PERSONA' ? 'Particular' : 'Empresa'}
                        </span>
                        <div className="fw-bold text-dark">{nombreCliente(cuenta.cliente)}</div>
                        <small className="text-muted font-monospace">{cuenta.numeroCuenta}</small>
                      </td>
                      <td className="small text-dark">
                        <div>{correoCliente(cuenta.cliente) ?? <span className="text-muted">Sin correo</span>}</div>
                        {documentoCliente(cuenta.cliente) && (
                          <small className="text-muted font-monospace">{documentoCliente(cuenta.cliente)}</small>
                        )}
                      </td>
                      <td className="small text-muted">{formatearFecha(cuenta.fechaUltimoMovimiento)}</td>
                      <td>
                        <span className={`fs-6 fw-bold font-monospace ${conDeuda ? 'text-danger' : 'text-success'}`}>
                          Deuda: $ {formatearMonto(deuda)}
                        </span>
                        <div>
                          <span className={`badge ${conDeuda ? 'bg-light-danger text-danger' : 'bg-light-success text-success'}`}>
                            {conDeuda ? 'Con deuda' : 'Al día'}
                          </span>
                        </div>
                        <div className="small text-success fw-semibold mt-1">
                          A favor: $ {formatearMonto(saldoFavor)}
                        </div>
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/cuentas-corrientes/${cuenta.cliente.idCliente}`}
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        >
                          <i className="ti ti-eye" />
                          <span>Ver detalle</span>
                        </Link>
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
              Página {meta.page} de {meta.totalPages} ({meta.total} total)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((current) => current + 1)}
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
