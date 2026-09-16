import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';
import type { Cliente, PaginatedResponse } from '../types/cliente.types';

type Accion = 'HABILITAR_CUENTA' | 'BAJA_CUENTA' | 'BAJA_CLIENTE';

interface Confirmacion {
  accion: Accion;
  cliente: Cliente;
}

function formatDocumento(value: string): string {
  if (value.length !== 11) return value;
  return `${value.slice(0, 2)}-${value.slice(2, 10)}-${value.slice(10)}`;
}

function actionCopy(confirmacion: Confirmacion): { titulo: string; mensaje: string; confirmar: string; danger: boolean } {
  const { accion, cliente } = confirmacion;
  if (accion === 'HABILITAR_CUENTA') {
    const reactivar = cliente.estadoCuenta === 'INACTIVA';
    return {
      titulo: reactivar ? 'Reactivar cuenta corriente' : 'Habilitar cuenta corriente',
      mensaje: `${reactivar ? 'Se reactivará' : 'Se creará'} la cuenta corriente de ${cliente.nombreMostrar} con saldo $ 0,00.`,
      confirmar: reactivar ? 'Reactivar cuenta' : 'Habilitar cuenta',
      danger: false,
    };
  }
  if (accion === 'BAJA_CUENTA') {
    return {
      titulo: 'Dar de baja la cuenta',
      mensaje: `Se dará de baja la cuenta ${cliente.cuentaCorriente?.numeroCuenta ?? ''} de ${cliente.nombreMostrar}.`,
      confirmar: 'Dar de baja',
      danger: true,
    };
  }
  return {
    titulo: 'Dar de baja el cliente',
    mensaje: `Se dará de baja a ${cliente.nombreMostrar}. Esta acción requiere que no tenga una cuenta activa.`,
    confirmar: 'Dar de baja',
    danger: true,
  };
}

export function ClientesListPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

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
    api.get<PaginatedResponse<Cliente>>('/clientes', {
      params: { buscar: consulta || undefined, page, limit: 10 },
    }).then(({ data }) => {
      if (active) {
        setClientes(data.data);
        setMeta(data.meta);
      }
    }).catch((requestError: unknown) => {
      if (active) setError(getApiErrorMessage(requestError));
    }).finally(() => {
      if (active) setCargando(false);
    });
    return () => { active = false; };
  }, [consulta, page, reloadKey]);

  async function ejecutarAccion() {
    if (!confirmacion) return;
    setProcesando(true);
    setError('');
    setExito('');
    try {
      if (confirmacion.accion === 'HABILITAR_CUENTA') {
        const { data } = await api.post<{ numeroCuenta: string }>('/cuentas-corrientes', {
          clienteId: confirmacion.cliente.idCliente,
        });
        setExito(`Cuenta ${data.numeroCuenta} habilitada correctamente.`);
      } else if (confirmacion.accion === 'BAJA_CUENTA') {
        await api.delete(`/cuentas-corrientes/${confirmacion.cliente.cuentaCorriente?.idCuentaCorriente}`);
        setExito('Cuenta corriente dada de baja correctamente.');
      } else {
        await api.delete(`/clientes/${confirmacion.cliente.idCliente}`);
        setExito('Cliente dado de baja correctamente.');
      }
      setConfirmacion(null);
      if (confirmacion.accion === 'BAJA_CLIENTE' && clientes.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setConfirmacion(null);
    } finally {
      setProcesando(false);
    }
  }

  const modalCopy = confirmacion ? actionCopy(confirmacion) : null;

  return (
    <div className="clientes-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title"><h4 className="mb-1 fw-bold">Clientes</h4></div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Clientes y cuentas corrientes</li>
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

      {error && <div className="alert alert-danger" role="alert"><i className="ti ti-alert-circle me-2" />{error}</div>}
      {exito && <div className="alert alert-success" role="status"><i className="ti ti-circle-check me-2" />{exito}</div>}

      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="input-group" style={{ maxWidth: '520px' }}>
            <span className="input-group-text bg-light border-end-0 text-muted"><i className="ti ti-search" /></span>
            <input
              type="search"
              className="form-control border-start-0 ps-0"
              placeholder="Buscar por DNI, CUIL, CUIT, apellido o razón social…"
              aria-label="Buscar clientes"
              value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
            />
          </div>
          <span className="badge bg-light-primary text-primary px-3 py-2 fs-6 fw-semibold">
            {meta.total} {meta.total === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datta-table">
              <thead className="table-light">
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Condición fiscal</th>
                  <th>Contacto</th>
                  <th>Cuenta corriente</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">
                    <span className="spinner-border spinner-border-sm text-primary me-2" />Cargando clientes…
                  </td></tr>
                )}
                {!cargando && !clientes.length && (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">
                    <i className="ti ti-users-minus fs-1 d-block mb-2" />No se encontraron clientes.
                  </td></tr>
                )}
                {!cargando && clientes.map((cliente) => {
                  const cuenta = cliente.cuentaCorriente;
                  const cuentaActiva = cliente.estadoCuenta === 'ACTIVA';
                  return (
                    <tr key={cliente.idCliente}>
                      <td>
                        <span className={`badge mb-1 ${cliente.tipo === 'PERSONA' ? 'bg-light-primary text-primary' : 'bg-light-secondary text-secondary'}`}>
                          {cliente.tipo === 'PERSONA' ? 'Particular' : 'Empresa'}
                        </span>
                        <div className="fw-bold text-dark">{cliente.nombreMostrar}</div>
                        {cliente.empresa && <small className="text-muted">Contacto: {cliente.empresa.personaContacto}</small>}
                      </td>
                      <td className="font-monospace small">
                        {cliente.persona ? (
                          <><div>DNI {cliente.persona.dni}</div><div className="text-muted">CUIL {formatDocumento(cliente.persona.cuil)}</div></>
                        ) : (
                          <div>CUIT {formatDocumento(cliente.empresa?.cuit ?? '')}</div>
                        )}
                      </td>
                      <td><span className="badge bg-light-info text-info">{cliente.condicionIva.nombre}</span></td>
                      <td className="small">
                        <div>{cliente.contacto.telefono || <span className="text-muted">Sin teléfono</span>}</div>
                        <div className="text-muted">{cliente.contacto.correo || 'Sin correo'}</div>
                        {cliente.contacto.direccion && <div className="text-muted text-truncate" style={{ maxWidth: '220px' }}>{cliente.contacto.direccion}</div>}
                      </td>
                      <td>
                        <span className={`badge ${cuentaActiva ? 'bg-light-success text-success' : cliente.estadoCuenta === 'INACTIVA' ? 'bg-light-warning text-warning' : 'bg-light-secondary text-secondary'}`}>
                          {cliente.estadoCuenta === 'SIN_CUENTA' ? 'Sin cuenta' : cliente.estadoCuenta === 'ACTIVA' ? 'Activa' : 'Inactiva'}
                        </span>
                        {cuenta && <>
                          <div className="font-monospace small mt-1">{cuenta.numeroCuenta}</div>
                          <strong className="small d-block text-danger">Deuda: $ {Number(cuenta.deuda ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                          <strong className="small d-block text-success">A favor: $ {Number(cuenta.saldoFavor ?? cuenta.saldo ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                        </>}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/clientes/${cliente.idCliente}/editar`} className="btn btn-outline-primary" title="Editar contacto">
                            <i className="ti ti-edit" />
                          </Link>
                          {!cuentaActiva && (
                            <button type="button" className="btn btn-outline-success" onClick={() => setConfirmacion({ accion: 'HABILITAR_CUENTA', cliente })} title={cliente.estadoCuenta === 'INACTIVA' ? 'Reactivar cuenta' : 'Habilitar cuenta'}>
                              <i className="ti ti-credit-card" />
                            </button>
                          )}
                          {esAdmin && cuentaActiva && (
                            <button type="button" className="btn btn-outline-warning" disabled={Number(cuenta?.deuda ?? 0) !== 0 || Number(cuenta?.saldoFavor ?? cuenta?.saldo ?? 0) !== 0} onClick={() => setConfirmacion({ accion: 'BAJA_CUENTA', cliente })} title={Number(cuenta?.deuda ?? 0) !== 0 || Number(cuenta?.saldoFavor ?? cuenta?.saldo ?? 0) !== 0 ? 'La cuenta tiene deuda o saldo a favor pendiente' : 'Dar de baja la cuenta'}>
                              <i className="ti ti-credit-card-off" />
                            </button>
                          )}
                          {esAdmin && (
                            <button type="button" className="btn btn-outline-danger" disabled={cuentaActiva} onClick={() => setConfirmacion({ accion: 'BAJA_CLIENTE', cliente })} title={cuentaActiva ? 'Debe dar de baja la cuenta primero' : 'Dar de baja cliente'}>
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
            <span className="small text-muted">Página {page} de {meta.totalPages} ({meta.total} total)</span>
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button>
              <button type="button" className="btn btn-outline-secondary" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {confirmacion && modalCopy && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} role="dialog" aria-modal="true" aria-labelledby="confirmacion-title">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="confirmacion-title">{modalCopy.titulo}</h5>
                <button type="button" className="btn-close" onClick={() => setConfirmacion(null)} disabled={procesando} aria-label="Cerrar" />
              </div>
              <div className="modal-body"><p className="mb-0">{modalCopy.mensaje}</p></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmacion(null)} disabled={procesando}>Cancelar</button>
                <button type="button" className={`btn ${modalCopy.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => void ejecutarAccion()} disabled={procesando}>
                  {procesando && <span className="spinner-border spinner-border-sm me-2" />}{modalCopy.confirmar}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
