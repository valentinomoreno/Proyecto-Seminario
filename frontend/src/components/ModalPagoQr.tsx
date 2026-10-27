import { QRCodeSVG } from 'qrcode.react';
import type { OrdenQr } from '../types/pagos.types';

interface Props {
  orden: OrdenQr;
  cancelando: boolean;
  onCancelar: () => void;
}

export function ModalPagoQr({ orden, cancelando, onCancelar }: Props) {
  return (
    <div className="modal d-block" role="dialog" aria-modal="true" aria-label="Cobro Mercado Pago QR" style={{ background: 'rgba(0,0,0,.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">Cobro Mercado Pago QR</h5></div>
          <div className="modal-body text-center">
            <p className="fs-4 fw-bold">${orden.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            {orden.qrData ? (
              <div className="d-inline-block p-3 bg-white border rounded"><QRCodeSVG value={orden.qrData} size={240} level="M" /></div>
            ) : <div className="spinner-border text-primary" role="status" />}
            <p className="mt-3 mb-1">{orden.estado === 'CREANDO' ? 'Preparando el QR…' : 'Esperando la acreditación del pago…'}</p>
            <small className="text-muted">Vence: {new Date(orden.venceEn).toLocaleTimeString('es-AR')}</small>
            {orden.error && <p className="alert alert-warning mt-3">{orden.error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" disabled={cancelando} onClick={onCancelar}>
              {cancelando ? 'Cancelando…' : 'Cancelar cobro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
