import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { Devolucion, DevolucionPayload } from '../types/devolucion.types';
import type { Venta } from '../types/venta.types';
import { diasTranscurridos, formatearFecha, formatearFechaHora, formatearMonto } from '../utils/formato';

const PLAZO_DEVOLUCION_DIAS = 15;

export function RegistrarDevolucionPage() {
  const [comprobante, setComprobante] = useState('');
  const [venta, setVenta] = useState<Venta | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const [idVentaDetalle, setIdVentaDetalle] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [aptoReingreso, setAptoReingreso] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [devolucion, setDevolucion] = useState<Devolucion | null>(null);

  const dias = useMemo(() => (venta ? diasTranscurridos(venta.fecha) : 0), [venta]);
  const plazoVencido = Boolean(venta) && dias > PLAZO_DEVOLUCION_DIAS;
  const diasRestantes = Math.max(PLAZO_DEVOLUCION_DIAS - dias, 0);

  const detalleSeleccionado = useMemo(
    () => venta?.detalles.find((detalle) => detalle.idVentaDetalle === idVentaDetalle) ?? null,
    [venta, idVentaDetalle],
  );

  const cantidadNumero = Number(cantidad);
  const cantidadValida = Number.isInteger(cantidadNumero)
    && cantidadNumero >= 1
    && detalleSeleccionado !== null
    && cantidadNumero <= detalleSeleccionado.cantidadDisponibleDevolucion;

  const montoPrevisto = detalleSeleccionado && cantidadValida
    ? Number(detalleSeleccionado.precioUnitario) * cantidadNumero
    : 0;

  const puedeEnviar = Boolean(venta)
    && !plazoVencido
    && detalleSeleccionado !== null
    && cantidadValida
    && motivo.trim().length > 0
    && !guardando;

  function limpiarFormulario() {
    setIdVentaDetalle(null);
    setCantidad('1');
    setMotivo('');
    setAptoReingreso(false);
    setError('');
  }

  async function buscarVenta(event: FormEvent) {
    event.preventDefault();
    const numero = comprobante.trim();
    if (!numero) { setErrorBusqueda('Ingresá un número de comprobante.'); return; }

    setBuscando(true);
    setErrorBusqueda('');
    setVenta(null);
    setDevolucion(null);
    limpiarFormulario();
    try {
      const { data } = await api.get<Venta>(`/ventas/comprobante/${encodeURIComponent(numero)}`);
      setVenta(data);
    } catch (requestError) {
      setErrorBusqueda(getApiErrorMessage(requestError));
    } finally {
      setBuscando(false);
    }
  }

  function seleccionarDetalle(idDetalle: number, disponible: number) {
    setIdVentaDetalle(idDetalle);
    setCantidad(disponible > 0 ? '1' : '0');
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!detalleSeleccionado) { setError('Seleccioná el ítem que se devuelve.'); return; }
    if (!cantidadValida) {
      setError(`La cantidad debe ser un número entero entre 1 y ${detalleSeleccionado.cantidadDisponibleDevolucion}.`);
      return;
    }
    if (!motivo.trim()) { setError('El motivo de la devolución es obligatorio.'); return; }
    if (plazoVencido) { setError('El plazo de 15 días para devolver esta venta ya venció.'); return; }

    setGuardando(true);
    const payload: DevolucionPayload = {
      idVentaDetalle: detalleSeleccionado.idVentaDetalle,
      cantidad: cantidadNumero,
      motivo: motivo.trim(),
      aptoReingreso,
    };
    try {
      const { data } = await api.post<Devolucion>('/devoluciones', payload);
      setDevolucion(data);
      setVenta(null);
      limpiarFormulario();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(false);
    }
  }

  function nuevaDevolucion() {
    setDevolucion(null);
    setComprobante('');
    setVenta(null);
    setErrorBusqueda('');
    limpiarFormulario();
  }

  return (
    <div className="registrar-devolucion-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">Registrar Devolución</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Nueva devolución</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTADO DE LA DEVOLUCIÓN */}
      {devolucion && (
        <div className="card shadow-sm border-0 rounded-3 mb-4">
          <div className="card-body p-5 text-center">
            <i className="ti ti-circle-check text-success" style={{ fontSize: '3.5rem' }} />
            <h4 className="fw-bold mt-3 mb-1">Devolución registrada</h4>
            <p className="text-muted mb-4">Se emitió la nota de crédito correspondiente.</p>

            <div className="d-inline-block bg-light rounded-3 px-4 py-3 mb-4">
              <div className="small text-muted text-uppercase fw-semibold">Nota de crédito</div>
              <div className="fs-3 fw-bold font-monospace text-primary">{devolucion.notaCredito.numero}</div>
              <div className="fw-semibold">$ {formatearMonto(devolucion.notaCredito.monto)}</div>
              <span className="badge bg-light-success text-success mt-2">{devolucion.notaCredito.estado}</span>
            </div>

            <div className="row justify-content-center g-3 mb-4">
              <div className="col-sm-4">
                <div className="border rounded-3 p-3">
                  <div className="small text-muted">Comprobante de venta</div>
                  <div className="fw-semibold font-monospace">{devolucion.venta.numeroComprobante}</div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="border rounded-3 p-3">
                  <div className="small text-muted">Repuesto devuelto</div>
                  <div className="fw-semibold">{devolucion.producto.nombre}</div>
                  <small className="text-muted font-monospace">{devolucion.producto.sku}</small>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="border rounded-3 p-3">
                  <div className="small text-muted">Cantidad devuelta</div>
                  <div className="fw-semibold">{devolucion.cantidadDevuelta}</div>
                  <span className={`badge ${devolucion.aptoReingreso ? 'bg-light-success text-success' : 'bg-light-warning text-warning'}`}>
                    {devolucion.aptoReingreso ? 'Reingresó a stock' : 'No apto para stock'}
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={nuevaDevolucion}>
                <i className="ti ti-plus" />
                <span>Registrar otra devolución</span>
              </button>
              <Link to="/cuentas-corrientes" className="btn btn-outline-secondary">Ver cuentas corrientes</Link>
            </div>
          </div>
        </div>
      )}

      {!devolucion && (
        <>
          {/* BÚSQUEDA POR COMPROBANTE */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                <i className="ti ti-file-invoice text-primary" />
                <span>1. Buscar la venta por número de comprobante</span>
              </h6>
            </div>
            <div className="card-body p-4">
              <form onSubmit={(event) => void buscarVenta(event)}>
                <div className="input-group" style={{ maxWidth: '560px' }}>
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0 font-monospace"
                    placeholder="Ej. FAC-0001-00000123"
                    aria-label="Número de comprobante"
                    value={comprobante}
                    onChange={(e) => setComprobante(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={buscando}>
                    {buscando ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Buscando…</span>
                      </>
                    ) : (
                      <>
                        <i className="ti ti-search" />
                        <span>Buscar venta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {errorBusqueda && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mt-3 mb-0" role="alert">
                  <i className="ti ti-alert-circle fs-5" />
                  <div>{errorBusqueda}</div>
                </div>
              )}
            </div>
          </div>

          {venta && (
            <form onSubmit={(event) => void submit(event)}>
              <div className="row g-4">
                <div className="col-lg-8">
                  {/* DATOS DE LA VENTA + PLAZO */}
                  <div className="card shadow-sm border-0 rounded-3 mb-4">
                    <div className="card-header bg-white py-3 border-bottom">
                      <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                        <i className="ti ti-calendar-event text-info" />
                        <span>2. Venta encontrada y plazo de devolución</span>
                      </h6>
                    </div>
                    <div className="card-body p-4">
                      <div className="row g-3 align-items-center">
                        <div className="col-md-4">
                          <div className="small text-muted">Comprobante</div>
                          <div className="fw-bold font-monospace">{venta.numeroComprobante}</div>
                        </div>
                        <div className="col-md-4">
                          <div className="small text-muted">Fecha de la venta</div>
                          <div className="fw-semibold">{formatearFechaHora(venta.fecha)}</div>
                        </div>
                        <div className="col-md-4">
                          <div className="small text-muted">Cliente</div>
                          <div className="fw-semibold">{venta.cliente.apellido}, {venta.cliente.nombre}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <span
                          className={`badge px-3 py-2 fs-6 fw-semibold ${plazoVencido ? 'bg-danger text-white' : 'bg-success text-white'}`}
                        >
                          <i className={`ti ${plazoVencido ? 'ti-clock-off' : 'ti-clock-check'} me-1`} />
                          {plazoVencido
                            ? `Plazo vencido — hace ${dias} ${dias === 1 ? 'día' : 'días'}`
                            : `Dentro del plazo (faltan ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'})`}
                        </span>
                        <div className="small text-muted mt-2">
                          Vendida el {formatearFecha(venta.fecha)} · {dias} {dias === 1 ? 'día transcurrido' : 'días transcurridos'} ·
                          {' '}Plazo máximo: {PLAZO_DEVOLUCION_DIAS} días.
                        </div>
                      </div>

                      {plazoVencido && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mt-3 mb-0" role="alert">
                          <i className="ti ti-ban fs-5" />
                          <div>
                            <strong>No se puede registrar la devolución.</strong> Transcurrieron {dias} días desde la
                            venta y el plazo máximo permitido es de {PLAZO_DEVOLUCION_DIAS} días.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ÍTEMS DE LA VENTA */}
                  <div className="card shadow-sm border-0 rounded-3">
                    <div className="card-header bg-white py-3 border-bottom">
                      <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                        <i className="ti ti-list-details text-warning" />
                        <span>3. Elegí el ítem a devolver</span>
                      </h6>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0 datta-table">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '54px' }} className="text-center">Sel.</th>
                              <th>Repuesto</th>
                              <th>Comprado</th>
                              <th>Ya devuelto</th>
                              <th>Disponible a devolver</th>
                              <th>Precio unitario</th>
                            </tr>
                          </thead>
                          <tbody>
                            {venta.detalles.map((detalle) => {
                              const disponible = detalle.cantidadDisponibleDevolucion;
                              const deshabilitado = disponible <= 0 || plazoVencido;
                              return (
                                <tr key={detalle.idVentaDetalle} className={idVentaDetalle === detalle.idVentaDetalle ? 'table-active' : ''}>
                                  <td className="text-center">
                                    <input
                                      type="radio"
                                      className="form-check-input"
                                      name="detalle-devolucion"
                                      checked={idVentaDetalle === detalle.idVentaDetalle}
                                      disabled={deshabilitado}
                                      onChange={() => seleccionarDetalle(detalle.idVentaDetalle, disponible)}
                                      aria-label={`Seleccionar ${detalle.producto.nombre}`}
                                    />
                                  </td>
                                  <td>
                                    <span className="badge bg-light-primary text-primary font-monospace mb-1">
                                      {detalle.producto.sku}
                                    </span>
                                    <div className="fw-bold text-dark">{detalle.producto.nombre}</div>
                                  </td>
                                  <td>{detalle.cantidad}</td>
                                  <td>{detalle.cantidadDevuelta}</td>
                                  <td>
                                    <span className={`badge ${disponible > 0 ? 'bg-light-success text-success' : 'bg-light-secondary text-secondary'}`}>
                                      {disponible} {disponible === 1 ? 'unidad' : 'unidades'}
                                    </span>
                                  </td>
                                  <td className="font-monospace">$ {formatearMonto(detalle.precioUnitario)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORMULARIO DE DEVOLUCIÓN */}
                <div className="col-lg-4">
                  <div className="card shadow-sm border-0 rounded-3">
                    <div className="card-header bg-white py-3 border-bottom">
                      <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                        <i className="ti ti-arrow-back-up text-danger" />
                        <span>4. Datos de la devolución</span>
                      </h6>
                    </div>
                    <div className="card-body p-4">
                      {error && (
                        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                          <i className="ti ti-alert-circle fs-5" />
                          <div>{error}</div>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label fw-semibold" htmlFor="input-devolucion-cantidad">
                          Cantidad a devolver <span className="text-danger">*</span>
                        </label>
                        <input
                          id="input-devolucion-cantidad"
                          type="number"
                          className="form-control"
                          min={1}
                          max={detalleSeleccionado?.cantidadDisponibleDevolucion ?? 1}
                          step={1}
                          value={cantidad}
                          onChange={(e) => setCantidad(e.target.value)}
                          disabled={!detalleSeleccionado || plazoVencido}
                        />
                        <small className="text-muted">
                          {detalleSeleccionado
                            ? `Máximo permitido: ${detalleSeleccionado.cantidadDisponibleDevolucion}`
                            : 'Seleccioná primero un ítem de la venta.'}
                        </small>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold" htmlFor="textarea-devolucion-motivo">
                          Motivo <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id="textarea-devolucion-motivo"
                          className="form-control"
                          rows={3}
                          maxLength={500}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          disabled={plazoVencido}
                          placeholder="Ej. El repuesto no corresponde al modelo solicitado"
                        />
                      </div>

                      <div className="form-check mb-4">
                        <input
                          id="check-devolucion-reingreso"
                          className="form-check-input"
                          type="checkbox"
                          checked={aptoReingreso}
                          onChange={(e) => setAptoReingreso(e.target.checked)}
                          disabled={plazoVencido}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="check-devolucion-reingreso">
                          Apto para reingreso a stock
                        </label>
                        <div className="small text-muted">
                          Marcalo solo si el repuesto vuelve en condiciones de ser vendido nuevamente.
                        </div>
                      </div>

                      {/* VISTA PREVIA NOTA DE CRÉDITO */}
                      <div className="border rounded-3 p-3 bg-light mb-4">
                        <div className="small text-uppercase text-muted fw-semibold mb-2">
                          Vista previa de la nota de crédito
                        </div>
                        {detalleSeleccionado ? (
                          <>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Repuesto</span>
                              <span className="fw-semibold text-end">{detalleSeleccionado.producto.nombre}</span>
                            </div>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Precio unitario</span>
                              <span className="font-monospace">$ {formatearMonto(detalleSeleccionado.precioUnitario)}</span>
                            </div>
                            <div className="d-flex justify-content-between small mb-2">
                              <span className="text-muted">Cantidad</span>
                              <span className="fw-semibold">{cantidadValida ? cantidadNumero : '—'}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold">Monto a acreditar</span>
                              <span className="fs-5 fw-bold font-monospace text-primary">
                                $ {formatearMonto(montoPrevisto)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-muted small">
                            Seleccioná un ítem y una cantidad para ver el monto de la nota de crédito.
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100 py-2 fw-semibold mb-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
                        disabled={!puedeEnviar}
                      >
                        {guardando ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            <span>Registrando…</span>
                          </>
                        ) : (
                          <>
                            <i className="ti ti-check" />
                            <span>Confirmar devolución</span>
                          </>
                        )}
                      </button>

                      {plazoVencido && (
                        <div className="small text-danger fw-semibold text-center">
                          <i className="ti ti-ban me-1" />
                          Deshabilitado: el plazo de {PLAZO_DEVOLUCION_DIAS} días venció hace {dias - PLAZO_DEVOLUCION_DIAS}{' '}
                          {dias - PLAZO_DEVOLUCION_DIAS === 1 ? 'día' : 'días'}.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
