import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../api/axios.instance';
import { clientesApi } from '../api/clientes.service';
import { ventasApi } from '../api/ventas.service';
import { ModalComprobante } from '../components/ModalComprobante';
import { ModalNuevoCliente } from '../components/ModalNuevoCliente';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { useCart } from '../context/useCart';
import type { Cliente } from '../types/cliente.types';
import type { ProductoCatalogo } from '../types/producto.types';
import type { MetodoCobro, ModalidadPago, VentaResponse } from '../types/venta.types';
import { api } from '../api/axios.instance';

function documentoCliente(cliente: Cliente): string {
  return cliente.persona?.dni ?? cliente.empresa?.cuit ?? '';
}

function tieneCuentaActiva(cliente: Cliente | null): boolean {
  return cliente?.estadoCuenta === 'ACTIVA' && Boolean(cliente.cuentaCorriente);
}

function tipoComprobante(cliente: Cliente | null): string {
  if (cliente?.condicionIva.codigo === 'RESPONSABLE_INSCRIPTO') return 'Factura A';
  if (cliente?.condicionIva.codigo === 'EXENTO') return 'Factura C';
  return 'Factura B';
}

export function PuntoDeVentaPage() {
  const { items, totalItems, total, agregarItem, modificarCantidad, eliminarItem, limpiarCarrito } =
    useCart();

  // Búsqueda de Repuestos
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  const [repuestos, setRepuestos] = useState<ProductoCatalogo[]>([]);
  const [cargandoRepuestos, setCargandoRepuestos] = useState(false);

  // Clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarModalNuevoCliente, setMostrarModalNuevoCliente] = useState(false);

  // Modalidad y Pago
  const [modalidadPago, setModalidadPago] = useState<ModalidadPago>('CONTADO');
  const [metodoCobro, setMetodoCobro] = useState<MetodoCobro>('EFECTIVO');
  const [referenciaPago, setReferenciaPago] = useState('');

  // Proceso de Venta
  const [procesando, setProcesando] = useState(false);
  const [errorVenta, setErrorVenta] = useState('');
  const [ventaConfirmada, setVentaConfirmada] = useState<VentaResponse | null>(null);
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);

  // Búsqueda remota de clientes con debounce para no limitar el POS a la primera página.
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      clientesApi
        .getClientes(busquedaCliente.trim(), 100)
        .then((res) => {
          if (!active) return;
          setClientes(res.data);
          setClienteSeleccionado((actual) => actual ?? res.data[0] ?? null);
        })
        .catch((requestError: unknown) => {
          if (active) setErrorVenta(getApiErrorMessage(requestError));
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [busquedaCliente]);

  // Búsqueda dinámica de repuestos (con debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCargandoRepuestos(true);
      api
        .get<{ data: ProductoCatalogo[] }>('/productos', {
          params: { buscar: busquedaRepuesto, limit: 12 },
        })
        .then(({ data }) => setRepuestos(data.data))
        .catch((requestError: unknown) => setErrorVenta(getApiErrorMessage(requestError)))
        .finally(() => setCargandoRepuestos(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [busquedaRepuesto]);

  // Si cambia el cliente y no tiene cuenta corriente habilitada, forzar contado
  useEffect(() => {
    if (clienteSeleccionado && !tieneCuentaActiva(clienteSeleccionado)) {
      setModalidadPago('CONTADO');
    }
  }, [clienteSeleccionado]);

  function solicitarConfirmacionVenta() {
    if (!clienteSeleccionado) {
      setErrorVenta('Por favor seleccione un cliente para la venta.');
      return;
    }
    if (items.length === 0) {
      setErrorVenta('El carrito de compras está vacío.');
      return;
    }

    setErrorVenta('');
    setConfirmacionVisible(true);
  }

  async function handleConfirmarVenta() {
    if (!clienteSeleccionado || items.length === 0) return;

    setErrorVenta('');
    setConfirmacionVisible(false);
    setProcesando(true);

    try {
      const response = await ventasApi.registrarVenta({
        idCliente: clienteSeleccionado.idCliente,
        modalidadPago,
        metodoCobro: modalidadPago === 'CONTADO' ? metodoCobro : undefined,
        referenciaPago: modalidadPago === 'CONTADO' ? referenciaPago.trim() || undefined : undefined,
        items: items.map((i) => ({ idProducto: i.idProducto, cantidad: i.cantidad })),
      });

      setVentaConfirmada(response);
      limpiarCarrito();
      setReferenciaPago('');
      void clientesApi.getCliente(clienteSeleccionado.idCliente).then((actualizado) => {
        setClientes((actuales) => actuales.map((cliente) =>
          cliente.idCliente === actualizado.idCliente ? actualizado : cliente,
        ));
        setClienteSeleccionado(actualizado);
      }).catch(() => undefined);
    } catch (err) {
      setErrorVenta(getApiErrorMessage(err));
    } finally {
      setProcesando(false);
    }
  }

  const clientesFiltrados = clientes.filter((c) => {
    if (!busquedaCliente.trim()) return true;
    const term = busquedaCliente.toLowerCase();
    return (
      c.nombreMostrar.toLowerCase().includes(term) ||
      c.persona?.cuil.includes(term) ||
      c.empresa?.cuit.includes(term) ||
      documentoCliente(c).includes(term)
    );
  });

  return (
    <div className="pos-page">
      {/* HEADER POS */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <i className="ti ti-device-laptop text-primary fs-2" />
            Punto de Venta de Mostrador (POS)
          </h3>
          <p className="text-muted mb-0">
            Registro de venta con control de stock pesimista, cobranza inmediata o crédito en cuenta corriente.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-light text-dark border px-3 py-2 fs-6">
            <i className="ti ti-shopping-cart me-1" />
            {totalItems} repuesto(s) seleccionados
          </span>
        </div>
      </div>

      <div className="row g-4">
        {/* COLUMNA IZQUIERDA: BUSCADOR Y CATÁLOGO DE REPUESTOS */}
        <div className="col-lg-7 col-xl-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="input-group input-group-lg mb-3">
                <span className="input-group-text bg-light border-end-0">
                  <i className="ti ti-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Buscar repuesto por SKU, código o nombre (Ej: pastillas, bujía, PROD-00001)..."
                  value={busquedaRepuesto}
                  onChange={(e) => setBusquedaRepuesto(e.target.value)}
                  autoFocus
                />
                {busquedaRepuesto && (
                  <button
                    className="btn btn-light border"
                    type="button"
                    onClick={() => setBusquedaRepuesto('')}
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {/* LISTA DE REPUESTOS */}
              {cargandoRepuestos ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  Buscando en catálogo...
                </div>
              ) : repuestos.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="ti ti-package-off fs-1 d-block mb-2 text-secondary" />
                  No se encontraron repuestos con los términos de búsqueda ingresados.
                </div>
              ) : (
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                  {repuestos.map((prod) => {
                    const sinStock = prod.stock <= 0;
                    const enCarrito = items.find((i) => i.idProducto === prod.idProducto);
                    const cantEnCarrito = enCarrito?.cantidad ?? 0;
                    const stockRestante = prod.stock - cantEnCarrito;

                    return (
                      <div className="col" key={prod.idProducto}>
                        <div className={`card h-100 border ${sinStock ? 'bg-light opacity-75' : ''}`}>
                          <div className="card-body p-3 d-flex flex-column justify-content-between">
                            <div>
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <span className="badge bg-secondary-subtle text-secondary small fw-bold">
                                  {prod.sku}
                                </span>
                                <span
                                  className={`badge ${
                                    sinStock
                                      ? 'bg-danger'
                                      : prod.stock <= 5
                                      ? 'bg-warning text-dark'
                                      : 'bg-success-subtle text-success'
                                  }`}
                                >
                                  Stock: {prod.stock}
                                </span>
                              </div>
                              <h6 className="card-title fw-bold text-dark mb-1 text-truncate" title={prod.nombre}>
                                {prod.nombre}
                              </h6>
                              <p className="card-text text-muted small mb-2 line-clamp-2" style={{ minHeight: '36px' }}>
                                {prod.descripcion}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-top pos-product-card-footer">
                              <span className="fs-5 fw-bold text-primary pos-product-price">
                                ${Number(prod.precioUnitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary d-flex align-items-center justify-content-center gap-1 w-100"
                                disabled={sinStock || stockRestante <= 0}
                                onClick={() => agregarItem(prod, 1)}
                                title={stockRestante <= 0 ? 'Stock máximo alcanzado en carrito' : 'Agregar al mostrador'}
                              >
                                <i className="ti ti-plus" />
                                <span>{cantEnCarrito > 0 ? `(${cantEnCarrito}) Agregar` : 'Agregar'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL DE VENTA Y COBRO */}
        <div className="col-lg-5 col-xl-4">
          <div className="card border-0 shadow-sm sticky-top" style={{ top: '85px', zIndex: 10 }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="ti ti-receipt text-primary" />
                Resumen de Venta
              </h5>
              {items.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={limpiarCarrito}
                  title="Vaciar mostrador"
                >
                  <i className="ti ti-trash me-1" />
                  Vaciar
                </button>
              )}
            </div>

            <div className="card-body p-3">
              {/* SELECTOR DE CLIENTE */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-bold small text-muted mb-0">CLIENTE *</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-link p-0 text-decoration-none fw-semibold"
                    onClick={() => setMostrarModalNuevoCliente(true)}
                  >
                    <i className="ti ti-user-plus me-1" />
                    + Nuevo
                  </button>
                </div>

                <div className="input-group input-group-sm mb-2">
                  <span className="input-group-text bg-light">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filtrar clientes por nombre o DNI..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                  />
                </div>

                <select
                  className="form-select form-select-sm"
                  value={clienteSeleccionado?.idCliente ?? ''}
                  onChange={(e) => {
                    const found = clientes.find((c) => c.idCliente === Number(e.target.value));
                    setClienteSeleccionado(found ?? null);
                  }}
                >
                  <option value="" disabled>
                    Seleccione un cliente...
                  </option>
                  {clientesFiltrados.map((c) => (
                    <option key={c.idCliente} value={c.idCliente}>
                      {c.nombreMostrar} ({documentoCliente(c)} · {c.condicionIva.nombre})
                    </option>
                  ))}
                </select>

                {clienteSeleccionado && (
                  <div className="mt-2 p-2 bg-light rounded small border">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Condición IVA:</span>
                      <strong className="badge bg-secondary-subtle text-secondary">
                        {clienteSeleccionado.condicionIva.nombre}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                      <span className="text-muted">Cuenta Corriente:</span>
                      {tieneCuentaActiva(clienteSeleccionado) ? (
                        <span className="text-success fw-bold">
                          ✓ Activa · Deuda: ${Number(clienteSeleccionado.cuentaCorriente?.deuda ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          {' · '}A favor: ${Number(clienteSeleccionado.cuentaCorriente?.saldoFavor ?? clienteSeleccionado.cuentaCorriente?.saldo ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-danger">✗ No habilitada</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* LISTA DEL CARRITO */}
              <label className="form-label fw-bold small text-muted mb-2">PRODUCTOS SELECCIONADOS</label>
              {items.length === 0 ? (
                <div className="border border-dashed rounded text-center py-4 text-muted small mb-3">
                  <i className="ti ti-basket fs-3 d-block mb-1 text-secondary" />
                  Agregue repuestos desde el catálogo para iniciar la venta.
                </div>
              ) : (
                <div className="cart-items-list mb-3" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {items.map((item) => (
                    <div
                      key={item.idProducto}
                      className="p-2 mb-2 bg-light rounded border d-flex align-items-center justify-content-between gap-2"
                    >
                      <div className="flex-grow-1 text-truncate">
                        <div className="fw-semibold text-truncate small">{item.nombre}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          ${item.precioUnitario.toLocaleString('es-AR')} c/u | Stock: {item.stock}
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary px-2 py-0"
                          onClick={() => modificarCantidad(item.idProducto, item.cantidad - 1)}
                        >
                          -
                        </button>
                        <span className="fw-bold small px-1">{item.cantidad}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary px-2 py-0"
                          disabled={item.cantidad >= item.stock}
                          onClick={() => modificarCantidad(item.idProducto, item.cantidad + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-end" style={{ minWidth: '70px' }}>
                        <div className="fw-bold small">${item.subtotal.toLocaleString('es-AR')}</div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm text-danger p-0 ms-1"
                        onClick={() => eliminarItem(item.idProducto)}
                        title="Quitar"
                      >
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* MODALIDAD DE PAGO: CONTADO VS CUENTA CORRIENTE */}
              <div className="mb-3">
                <label className="form-label fw-bold small text-muted mb-2">CONDICIÓN DE PAGO *</label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${modalidadPago === 'CONTADO' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setModalidadPago('CONTADO')}
                  >
                    <i className="ti ti-cash me-1" />
                    Pago Contado
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      modalidadPago === 'CUENTA_CORRIENTE' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'
                    }`}
                    disabled={!tieneCuentaActiva(clienteSeleccionado)}
                    onClick={() => setModalidadPago('CUENTA_CORRIENTE')}
                    title={
                      !tieneCuentaActiva(clienteSeleccionado)
                        ? 'El cliente no tiene cuenta corriente habilitada'
                        : 'Cargar a cuenta corriente'
                    }
                  >
                    <i className="ti ti-credit-card me-1" />
                    Cuenta Corriente
                  </button>
                </div>
              </div>

              {/* SI ES CONTADO: SELECTOR MÉTODO DE COBRO */}
              {modalidadPago === 'CONTADO' ? (
                <div className="p-3 bg-light rounded border mb-3">
                  <label className="form-label fw-bold small text-muted mb-1">MÉTODO DE COBRO</label>
                  <select
                    className="form-select form-select-sm mb-2"
                    value={metodoCobro}
                    onChange={(e) => setMetodoCobro(e.target.value as MetodoCobro)}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                    <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  </select>

                  {metodoCobro !== 'EFECTIVO' && (
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="N° Comprobante / Cupón / Ref..."
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                    />
                  )}
                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                    Emite {tipoComprobante(clienteSeleccionado)}.
                  </small>
                </div>
              ) : (
                <div className="p-3 bg-warning-subtle rounded border border-warning mb-3 small">
                  <div className="d-flex align-items-center gap-2 fw-bold text-dark mb-1">
                    <i className="ti ti-alert-triangle text-warning" />
                    Carga diferida a Cuenta Corriente
                  </div>
                  <p className="text-muted mb-0">
                    No se registra cobro ahora. Se aumentará el saldo deudor del cliente y se emitirá un{' '}
                    <strong>Remito Comercial</strong>.
                  </p>
                </div>
              )}

              {/* TOTAL A PAGAR */}
              <div className="p-3 bg-dark text-white rounded mb-3 d-flex justify-content-between align-items-center">
                <span className="fs-6 text-white-50">TOTAL:</span>
                <span className="fs-3 fw-bold">${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>

              {errorVenta && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="ti ti-alert-circle me-1" />
                  {errorVenta}
                </div>
              )}

              {/* BOTÓN CONFIRMAR */}
              <button
                type="button"
                className="btn btn-success btn-lg w-100 fw-bold d-flex justify-content-center align-items-center gap-2"
                disabled={procesando || items.length === 0 || !clienteSeleccionado}
                onClick={solicitarConfirmacionVenta}
              >
                {procesando ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    Procesando Venta...
                  </>
                ) : (
                  <>
                    <i className="ti ti-check" />
                    Confirmar y Facturar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ALTA RÁPIDA CLIENTE */}
      {mostrarModalNuevoCliente && (
        <ModalNuevoCliente
          onClose={() => setMostrarModalNuevoCliente(false)}
          onClienteCreado={(nuevo) => {
            setClientes((prev) => [nuevo, ...prev]);
            setClienteSeleccionado(nuevo);
          }}
        />
      )}

      <ConfirmActionModal
        open={confirmacionVisible}
        title="¿Confirmar la venta?"
        message={(
          <div>
            <p className="mb-2">Se registrará la venta para <strong>{clienteSeleccionado?.nombreMostrar}</strong>.</p>
            <div className="d-flex justify-content-between border rounded p-3 bg-light">
              <span>{modalidadPago === 'CUENTA_CORRIENTE' ? 'Cargo a cuenta corriente' : 'Total a cobrar'}</span>
              <strong>$ {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <small className="text-muted d-block mt-2">Una vez confirmada se descontará el stock y se emitirá el comprobante.</small>
          </div>
        )}
        confirmLabel="Sí, confirmar y facturar"
        confirmVariant="success"
        processing={procesando}
        onCancel={() => setConfirmacionVisible(false)}
        onConfirm={() => void handleConfirmarVenta()}
      />

      {/* MODAL COMPROBANTE GENERADO */}
      {ventaConfirmada && (
        <ModalComprobante
          venta={ventaConfirmada}
          onNuevaVenta={() => setVentaConfirmada(null)}
        />
      )}
    </div>
  );
}
