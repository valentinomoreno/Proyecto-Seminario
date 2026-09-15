import type { VentaResponse } from '../types/venta.types';

interface Props {
  venta: VentaResponse;
  onNuevaVenta: () => void;
}

export function ModalComprobante({ venta, onNuevaVenta }: Props) {
  const factura = venta.factura;
  const cobro = venta.cobro;
  const cliente = venta.cliente;
  const esRemito = factura?.tipoFactura === 'REMITO';
  const tituloComprobante = esRemito ? 'REMITO DE ENTREGA' : `FACTURA ${factura?.tipoFactura?.replace('FACTURA_', '') ?? 'B'}`;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} role="dialog">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="ti ti-circle-check" />
              ¡Operación Registrada con Éxito!
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onNuevaVenta} aria-label="Cerrar" />
          </div>

          <div className="modal-body p-4">
            {/* TICKET / COMPROBANTE CONTAINER */}
            <div className="border rounded p-4 bg-white shadow-sm print-area">
              <div className="row pb-3 mb-3 border-bottom align-items-center">
                <div className="col-sm-6">
                  <h4 className="fw-bold text-primary mb-1">AUTOPARTES S.A.</h4>
                  <p className="text-muted small mb-0">Av. Central 1234, Córdoba, Argentina</p>
                  <p className="text-muted small mb-0">CUIT: 30-71234567-9 | IVA Responsable Inscripto</p>
                </div>
                <div className="col-sm-6 text-sm-end mt-3 mt-sm-0">
                  <span className={`badge fs-6 ${esRemito ? 'bg-warning text-dark' : 'bg-primary text-white'}`}>
                    {tituloComprobante}
                  </span>
                  <h5 className="fw-bold text-dark mt-2 mb-1">{factura?.numeroFactura ?? venta.numeroVenta}</h5>
                  <p className="text-muted small mb-0">
                    Fecha: {new Date(venta.fecha).toLocaleString('es-AR')}
                  </p>
                  <p className="text-muted small mb-0">Venta: #{venta.numeroVenta}</p>
                </div>
              </div>

              {/* CLIENTE & FORMA DE PAGO */}
              <div className="row py-2 mb-3 bg-light rounded g-2 small">
                <div className="col-sm-6">
                  <span className="text-muted d-block">Cliente:</span>
                  <strong className="fs-6">{cliente.persona.nombre} {cliente.persona.apellido}</strong>
                  <div className="text-muted">
                    DNI/CUIL: {cliente.persona.dni} / {cliente.persona.cuil}
                  </div>
                  <div className="text-muted">
                    Condición IVA: <strong>{cliente.condicionIva.replace('_', ' ')}</strong>
                  </div>
                </div>
                <div className="col-sm-6 text-sm-end">
                  <span className="text-muted d-block">Condición de Venta:</span>
                  <strong className={`fs-6 ${venta.modalidadPago === 'CUENTA_CORRIENTE' ? 'text-warning' : 'text-success'}`}>
                    {venta.modalidadPago === 'CUENTA_CORRIENTE' ? 'CARGA A CUENTA CORRIENTE' : 'CONTADO'}
                  </strong>
                  {cobro && (
                    <div className="text-muted">
                      Método: <strong>{cobro.metodoCobro.replace('_', ' ')}</strong>
                      {cobro.referencia && ` (Ref: ${cobro.referencia})`}
                    </div>
                  )}
                  {esRemito && (
                    <div className="text-warning small mt-1">
                      <i className="ti ti-info-circle me-1" /> Imputado en cuenta corriente
                    </div>
                  )}
                </div>
              </div>

              {/* TABLA DE PRODUCTOS */}
              <div className="table-responsive my-3">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light text-center small">
                    <tr>
                      <th style={{ width: '15%' }}>SKU</th>
                      <th className="text-start">Descripción</th>
                      <th style={{ width: '12%' }}>Cant.</th>
                      <th style={{ width: '18%' }} className="text-end">P. Unitario</th>
                      <th style={{ width: '18%' }} className="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {venta.detalles.map((det) => (
                      <tr key={det.idDetalleVenta}>
                        <td className="text-center text-muted">{det.producto.sku}</td>
                        <td className="fw-semibold">{det.producto.nombre}</td>
                        <td className="text-center fw-bold">{det.cantidad}</td>
                        <td className="text-end">${Number(det.precioUnitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="text-end fw-bold">${Number(det.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTALES */}
              <div className="row justify-content-end">
                <div className="col-sm-5">
                  <ul className="list-group list-group-flush small">
                    {factura?.tipoFactura === 'FACTURA_A' && (
                      <>
                        <li className="list-group-item d-flex justify-content-between px-0">
                          <span>Subtotal Neto:</span>
                          <strong>${Number(factura.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between px-0">
                          <span>IVA (21%):</span>
                          <strong>${Number(factura.iva).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                        </li>
                      </>
                    )}
                    <li className="list-group-item d-flex justify-content-between px-0 fs-5 border-top">
                      <span className="fw-bold">Total:</span>
                      <span className="fw-bold text-primary">${Number(venta.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* PIE FISCAL O REMITO */}
              <div className="border-top pt-3 mt-3 text-muted text-center small">
                {factura?.cae ? (
                  <p className="mb-0">
                    <strong>CAE:</strong> {factura.cae} &nbsp;|&nbsp; 
                    <strong> Vto. CAE:</strong> {factura.fechaVencimientoCae ?? 'Sin fecha'}
                  </p>
                ) : (
                  <p className="mb-0 fst-italic">
                    Comprobante no válido como factura. Documento de entrega para respaldo de cuenta corriente.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer bg-light justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              onClick={() => window.print()}
            >
              <i className="ti ti-printer" /> Imprimir Comprobante
            </button>
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2 fw-bold"
              onClick={onNuevaVenta}
            >
              <i className="ti ti-plus" /> Iniciar Nueva Venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
