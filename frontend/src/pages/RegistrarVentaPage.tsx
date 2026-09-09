import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { Cliente } from '../types/cliente.types';
import type { PaginatedResponse, Producto } from '../types/producto.types';
import type { Venta, VentaPayload } from '../types/venta.types';
import { formatearMonto } from '../utils/formato';

interface ItemVenta {
  idProducto: number;
  sku: string;
  nombre: string;
  precioUnitario: number;
  stockDisponible: number;
  cantidad: number;
}

export function RegistrarVentaPage() {
  const [buscarCliente, setBuscarCliente] = useState('');
  const [consultaCliente, setConsultaCliente] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  const [buscarProducto, setBuscarProducto] = useState('');
  const [consultaProducto, setConsultaProducto] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);

  const [items, setItems] = useState<ItemVenta[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ventaCreada, setVentaCreada] = useState<Venta | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setConsultaCliente(buscarCliente.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [buscarCliente]);

  useEffect(() => {
    if (!consultaCliente || clienteSeleccionado) { setClientes([]); return; }
    let active = true;
    setBuscandoClientes(true);
    api.get<PaginatedResponse<Cliente>>('/clientes', { params: { buscar: consultaCliente, page: 1, limit: 5 } })
      .then(({ data }) => { if (active) setClientes(data.data); })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setBuscandoClientes(false); });
    return () => { active = false; };
  }, [consultaCliente, clienteSeleccionado]);

  useEffect(() => {
    const timer = window.setTimeout(() => setConsultaProducto(buscarProducto.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [buscarProducto]);

  useEffect(() => {
    if (!consultaProducto) { setProductos([]); return; }
    let active = true;
    setBuscandoProductos(true);
    api.get<PaginatedResponse<Producto>>('/productos', { params: { buscar: consultaProducto, page: 1, limit: 6 } })
      .then(({ data }) => { if (active) setProductos(data.data); })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setBuscandoProductos(false); });
    return () => { active = false; };
  }, [consultaProducto]);

  const total = useMemo(
    () => items.reduce((acumulado, item) => acumulado + item.precioUnitario * item.cantidad, 0),
    [items],
  );

  function seleccionarCliente(cliente: Cliente) {
    setClienteSeleccionado(cliente);
    setBuscarCliente('');
    setConsultaCliente('');
    setClientes([]);
  }

  function agregarProducto(producto: Producto) {
    setError('');
    const existente = items.find((item) => item.idProducto === producto.idProducto);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        setError(`No hay más stock disponible de "${producto.nombre}".`);
        return;
      }
      setItems((current) => current.map((item) => (
        item.idProducto === producto.idProducto ? { ...item, cantidad: item.cantidad + 1 } : item
      )));
      return;
    }
    if (producto.stock <= 0) {
      setError(`El producto "${producto.nombre}" no tiene stock disponible.`);
      return;
    }
    setItems((current) => [...current, {
      idProducto: producto.idProducto,
      sku: producto.sku,
      nombre: producto.nombre,
      precioUnitario: Number(producto.precioUnitario),
      stockDisponible: producto.stock,
      cantidad: 1,
    }]);
  }

  function cambiarCantidad(idProducto: number, valor: string) {
    const cantidad = Number(valor);
    setItems((current) => current.map((item) => {
      if (item.idProducto !== idProducto) return item;
      if (!Number.isFinite(cantidad) || cantidad < 1) return { ...item, cantidad: 1 };
      return { ...item, cantidad: Math.min(Math.floor(cantidad), item.stockDisponible) };
    }));
  }

  function quitarItem(idProducto: number) {
    setItems((current) => current.filter((item) => item.idProducto !== idProducto));
  }

  function nuevaVenta() {
    setVentaCreada(null);
    setClienteSeleccionado(null);
    setItems([]);
    setBuscarCliente('');
    setBuscarProducto('');
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!clienteSeleccionado) { setError('Debe seleccionar un cliente.'); return; }
    if (!items.length) { setError('Debe agregar al menos un ítem a la venta.'); return; }

    setGuardando(true);
    const payload: VentaPayload = {
      idCliente: clienteSeleccionado.idCliente,
      items: items.map((item) => ({ idProducto: item.idProducto, cantidad: item.cantidad })),
    };
    try {
      const { data } = await api.post<Venta>('/ventas', payload);
      setVentaCreada(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(false);
    }
  }

  if (ventaCreada) {
    return (
      <div className="registrar-venta-datta-view">
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-body p-5 text-center">
            <i className="ti ti-circle-check text-success" style={{ fontSize: '3.5rem' }} />
            <h4 className="fw-bold mt-3 mb-1">Venta registrada con éxito</h4>
            <p className="text-muted mb-4">
              Conservá el número de comprobante: es el dato requerido para registrar una devolución.
            </p>

            <div className="d-inline-block bg-light rounded-3 px-4 py-3 mb-4">
              <div className="small text-muted text-uppercase fw-semibold">Número de comprobante</div>
              <div className="fs-3 fw-bold font-monospace text-primary">{ventaCreada.numeroComprobante}</div>
            </div>

            <div className="row justify-content-center g-3 mb-4">
              <div className="col-sm-4">
                <div className="border rounded-3 p-3">
                  <div className="small text-muted">Cliente</div>
                  <div className="fw-semibold">
                    {ventaCreada.cliente.apellido}, {ventaCreada.cliente.nombre}
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="border rounded-3 p-3">
                  <div className="small text-muted">Ítems</div>
                  <div className="fw-semibold">{ventaCreada.detalles.length}</div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="border rounded-3 p-3">
                  <div className="small text-muted">Total</div>
                  <div className="fw-bold font-monospace">$ {formatearMonto(ventaCreada.total)}</div>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={nuevaVenta}>
                <i className="ti ti-plus" />
                <span>Registrar otra venta</span>
              </button>
              <Link to="/devoluciones/nueva" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                <i className="ti ti-arrow-back-up" />
                <span>Ir a devoluciones</span>
              </Link>
              <Link to="/catalogo" className="btn btn-light">Volver al catálogo</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registrar-venta-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">Registrar Venta</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item active fw-semibold text-primary">Nueva venta</li>
              </ul>
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

      <form onSubmit={(event) => void submit(event)}>
        <div className="row g-4">
          <div className="col-lg-8">
            {/* CLIENTE */}
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-user text-primary" />
                  <span>1. Cliente</span>
                </h6>
              </div>
              <div className="card-body p-4">
                {clienteSeleccionado ? (
                  <div className="d-flex align-items-center justify-content-between border rounded-3 p-3 bg-light">
                    <div>
                      <div className="fw-bold text-dark">
                        {clienteSeleccionado.apellido}, {clienteSeleccionado.nombre}
                      </div>
                      <small className="text-muted">
                        {clienteSeleccionado.dniCuit} · {clienteSeleccionado.email}
                      </small>
                      <div className="mt-1">
                        <span className={`badge ${Number(clienteSeleccionado.saldoCuentaCorriente) > 0 ? 'bg-light-danger text-danger' : 'bg-light-success text-success'}`}>
                          Saldo: $ {formatearMonto(clienteSeleccionado.saldoCuentaCorriente)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setClienteSeleccionado(null)}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="input-group mb-3">
                      <span className="input-group-text bg-light border-end-0 text-muted">
                        <i className="ti ti-search" />
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Buscar cliente por nombre, apellido, DNI/CUIT o email…"
                        aria-label="Buscar cliente"
                        value={buscarCliente}
                        onChange={(e) => setBuscarCliente(e.target.value)}
                      />
                    </div>
                    {buscandoClientes && (
                      <div className="text-muted small">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                        Buscando clientes…
                      </div>
                    )}
                    {!buscandoClientes && consultaCliente && !clientes.length && (
                      <div className="text-muted small">No se encontraron clientes con ese criterio.</div>
                    )}
                    <div className="list-group">
                      {clientes.map((cliente) => (
                        <button
                          key={cliente.idCliente}
                          type="button"
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                          onClick={() => seleccionarCliente(cliente)}
                        >
                          <span>
                            <span className="fw-semibold">{cliente.apellido}, {cliente.nombre}</span>
                            <small className="text-muted d-block">{cliente.dniCuit} · {cliente.email}</small>
                          </span>
                          <i className="ti ti-chevron-right text-muted" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PRODUCTOS */}
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-package text-success" />
                  <span>2. Agregar repuestos</span>
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="input-group mb-3">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Buscar repuesto por nombre o código SKU…"
                    aria-label="Buscar repuesto"
                    value={buscarProducto}
                    onChange={(e) => setBuscarProducto(e.target.value)}
                  />
                </div>
                {buscandoProductos && (
                  <div className="text-muted small">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                    Buscando repuestos…
                  </div>
                )}
                {!buscandoProductos && consultaProducto && !productos.length && (
                  <div className="text-muted small">No se encontraron repuestos con ese criterio.</div>
                )}
                <div className="list-group">
                  {productos.map((producto) => (
                    <div
                      key={producto.idProducto}
                      className="list-group-item d-flex justify-content-between align-items-center gap-3"
                    >
                      <div>
                        <span className="badge bg-light-primary text-primary font-monospace me-2">{producto.sku}</span>
                        <span className="fw-semibold">{producto.nombre}</span>
                        <small className="text-muted d-block">
                          Precio: $ {formatearMonto(producto.precioUnitario)}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${
                          producto.stock === 0
                            ? 'bg-light-danger text-danger'
                            : producto.stock < 5
                            ? 'bg-light-warning text-warning'
                            : 'bg-light-success text-success'
                        }`}>
                          {producto.stock} en stock
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => agregarProducto(producto)}
                          disabled={producto.stock <= 0}
                          title="Agregar a la venta"
                        >
                          <i className="ti ti-plus" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ÍTEMS */}
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-list-details text-warning" />
                  <span>3. Ítems de la venta</span>
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 datta-table">
                    <thead className="table-light">
                      <tr>
                        <th>Repuesto</th>
                        <th style={{ width: '120px' }}>Cantidad</th>
                        <th>Precio unitario</th>
                        <th>Subtotal</th>
                        <th style={{ width: '70px' }} className="text-end">Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!items.length && (
                        <tr>
                          <td colSpan={5} className="text-center py-5 text-muted">
                            <i className="ti ti-shopping-cart-off fs-1 d-block mb-2 text-secondary" />
                            Todavía no agregaste ítems a la venta.
                          </td>
                        </tr>
                      )}
                      {items.map((item) => (
                        <tr key={item.idProducto}>
                          <td>
                            <span className="badge bg-light-primary text-primary font-monospace mb-1">{item.sku}</span>
                            <div className="fw-bold text-dark">{item.nombre}</div>
                            <small className="text-muted">Stock disponible: {item.stockDisponible}</small>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min={1}
                              max={item.stockDisponible}
                              step={1}
                              value={item.cantidad}
                              onChange={(e) => cambiarCantidad(item.idProducto, e.target.value)}
                              aria-label={`Cantidad de ${item.nombre}`}
                            />
                          </td>
                          <td className="font-monospace">$ {formatearMonto(item.precioUnitario)}</td>
                          <td className="fw-bold font-monospace text-dark">
                            $ {formatearMonto(item.precioUnitario * item.cantidad)}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => quitarItem(item.idProducto)}
                              title="Quitar ítem"
                            >
                              <i className="ti ti-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* RESUMEN */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-receipt text-info" />
                  <span>Resumen</span>
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Cliente</span>
                  <span className="fw-semibold text-end">
                    {clienteSeleccionado
                      ? `${clienteSeleccionado.apellido}, ${clienteSeleccionado.nombre}`
                      : 'Sin seleccionar'}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Ítems</span>
                  <span className="fw-semibold">{items.length}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Unidades</span>
                  <span className="fw-semibold">
                    {items.reduce((acumulado, item) => acumulado + item.cantidad, 0)}
                  </span>
                </div>
                <hr />
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="fw-bold">Total</span>
                  <span className="fs-4 fw-bold font-monospace text-primary">$ {formatearMonto(total)}</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold mb-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={guardando || !clienteSeleccionado || !items.length}
                >
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Registrando…</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check" />
                      <span>Confirmar venta</span>
                    </>
                  )}
                </button>
                <Link to="/catalogo" className="btn btn-light w-100 fw-semibold">Cancelar</Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
