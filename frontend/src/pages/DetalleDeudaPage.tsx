import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';
import type {
  CuentaCorrienteDetalle,
  PagoPayload,
  TipoMovimientoCtaCte,
} from '../types/cuenta-corriente.types';
import { correoCliente, documentoCliente, nombreCliente } from '../utils/cliente';
import { formatearFechaHora, formatearMonto } from '../utils/formato';

const ETIQUETAS_MOVIMIENTO: Record<TipoMovimientoCtaCte, { texto: string; clase: string; icono: string }> = {
  IMPUTACION_VENTA: { texto: 'Imputación de venta', clase: 'bg-light-primary text-primary', icono: 'ti-shopping-cart' },
  PAGO: { texto: 'Pago', clase: 'bg-light-success text-success', icono: 'ti-cash' },
  MORA: { texto: 'Mora', clase: 'bg-light-danger text-danger', icono: 'ti-alert-triangle' },
  NOTA_CREDITO: { texto: 'Nota de crédito', clase: 'bg-light-warning text-warning', icono: 'ti-receipt-refund' },
};

export function DetalleDeudaPage() {
  const { idCliente } = useParams();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  const [cuenta, setCuenta] = useState<CuentaCorrienteDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [monto, setMonto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorPago, setErrorPago] = useState('');
  const [exitoPago, setExitoPago] = useState('');

  useEffect(() => {
    if (!idCliente) return;
    let active = true;
    setCargando(true);
    setError('');
    api.get<CuentaCorrienteDetalle>(`/cuentas-corrientes/cliente/${idCliente}/historial`)
      .then(({ data }) => { if (active) setCuenta(data); })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [idCliente, reloadKey]);

  async function registrarPago(event: FormEvent) {
    event.preventDefault();
    setErrorPago('');
    setExitoPago('');
    const montoNumero = Number(monto);
    if (!monto.trim() || !Number.isFinite(montoNumero) || montoNumero <= 0) {
      setErrorPago('Ingresá un monto mayor a cero.');
      return;
    }

    setGuardando(true);
    const payload: PagoPayload = {
      monto: montoNumero,
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
    };
    try {
      await api.post(`/cuentas-corrientes/cliente/${idCliente}/pagos`, payload);
      setMonto('');
      setObservaciones('');
      setExitoPago(`Pago de $ ${formatearMonto(montoNumero)} registrado correctamente.`);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setErrorPago(getApiErrorMessage(requestError));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="card shadow-sm border-0 text-center py-5">
        <div className="card-body text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
          Cargando cuenta corriente…
        </div>
      </div>
    );
  }

  if (error || !cuenta) {
    return (
      <div className="detalle-deuda-datta-view">
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <i className="ti ti-alert-circle fs-5" />
          <div>{error || 'No se encontró la cuenta corriente solicitada.'}</div>
        </div>
        <Link to="/cuentas-corrientes" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1">
          <i className="ti ti-arrow-left" />
          <span>Volver a cuentas corrientes</span>
        </Link>
      </div>
    );
  }

  const saldo = Number(cuenta.saldo ?? 0);
  const conDeuda = saldo > 0;

  return (
    <div className="detalle-deuda-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">
                  Cuenta corriente de {nombreCliente(cuenta.cliente)}
                </h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item">
                  <Link to="/cuentas-corrientes" className="text-muted">Cuentas corrientes</Link>
                </li>
                <li className="breadcrumb-item active fw-semibold text-primary">Detalle de deuda</li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/cuentas-corrientes" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1">
                <i className="ti ti-arrow-left" />
                <span>Volver</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className={esAdmin ? 'col-lg-8' : 'col-12'}>
          {/* RESUMEN DEL CLIENTE */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4">
              <div className="row g-3 align-items-center">
                <div className="col-md-5">
                  <div className="small text-muted">Cliente</div>
                  <div className="fw-bold text-dark fs-6">{nombreCliente(cuenta.cliente)}</div>
                  <small className="text-muted d-block">{correoCliente(cuenta.cliente) ?? 'Sin correo registrado'}</small>
                  {documentoCliente(cuenta.cliente) && (
                    <small className="text-muted font-monospace">{documentoCliente(cuenta.cliente)}</small>
                  )}
                </div>
                <div className="col-md-3">
                  <div className="small text-muted">Último movimiento</div>
                  <div className="fw-semibold">{formatearFechaHora(cuenta.fechaUltimoMovimiento)}</div>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="small text-muted">Saldo actual</div>
                  <div className={`fs-3 fw-bold font-monospace ${conDeuda ? 'text-danger' : 'text-success'}`}>
                    $ {formatearMonto(saldo)}
                  </div>
                  <span className={`badge ${conDeuda ? 'bg-light-danger text-danger' : 'bg-light-success text-success'}`}>
                    {conDeuda ? 'Con deuda pendiente' : 'Sin deuda'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HISTORIAL */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
              <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                <i className="ti ti-history text-primary" />
                <span>Historial de movimientos</span>
              </h6>
              <span className="badge bg-light-primary text-primary px-3 py-2 fw-semibold">
                {cuenta.movimientos.length} {cuenta.movimientos.length === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 datta-table">
                  <thead className="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Observaciones</th>
                      <th className="text-end">Monto</th>
                      <th className="text-end">Saldo resultante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!cuenta.movimientos.length && (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-muted">
                          <i className="ti ti-file-off fs-1 d-block mb-2 text-secondary" />
                          La cuenta todavía no registra movimientos.
                        </td>
                      </tr>
                    )}
                    {cuenta.movimientos.map((movimiento) => {
                      const etiqueta = ETIQUETAS_MOVIMIENTO[movimiento.tipo];
                      const montoMovimiento = Number(movimiento.monto ?? 0);
                      const aumentaDeuda = montoMovimiento > 0;
                      return (
                        <tr key={movimiento.idMovimientoCtaCte}>
                          <td className="small text-muted">{formatearFechaHora(movimiento.fecha)}</td>
                          <td>
                            <span className={`badge ${etiqueta?.clase ?? 'bg-light-secondary text-secondary'}`}>
                              <i className={`ti ${etiqueta?.icono ?? 'ti-point'} me-1`} />
                              {etiqueta?.texto ?? movimiento.tipo}
                            </span>
                          </td>
                          <td className="small text-dark">{movimiento.observaciones || '—'}</td>
                          <td className={`text-end fw-bold font-monospace ${aumentaDeuda ? 'text-danger' : 'text-success'}`}>
                            {aumentaDeuda ? '+' : '−'} $ {formatearMonto(Math.abs(montoMovimiento))}
                          </td>
                          <td className="text-end font-monospace">
                            $ {formatearMonto(movimiento.saldoResultante)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* REGISTRAR PAGO — SOLO ADMINISTRADOR */}
        {esAdmin && (
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-cash text-success" />
                  <span>Registrar pago</span>
                </h6>
                <span className="badge bg-light-success text-success">Admin</span>
              </div>
              <div className="card-body p-4">
                {errorPago && (
                  <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                    <i className="ti ti-alert-circle fs-5" />
                    <div>{errorPago}</div>
                  </div>
                )}
                {exitoPago && (
                  <div className="alert alert-success d-flex align-items-center gap-2" role="alert">
                    <i className="ti ti-circle-check fs-5" />
                    <div>{exitoPago}</div>
                  </div>
                )}

                <form onSubmit={(event) => void registrarPago(event)}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="input-pago-monto">
                      Monto <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">$</span>
                      <input
                        id="input-pago-monto"
                        type="number"
                        className="form-control"
                        min="0.01"
                        step="0.01"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold" htmlFor="textarea-pago-observaciones">
                      Observaciones
                    </label>
                    <textarea
                      id="textarea-pago-observaciones"
                      className="form-control"
                      rows={3}
                      maxLength={500}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej. Pago en efectivo en mostrador"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Registrando…</span>
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy" />
                        <span>Registrar pago</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
