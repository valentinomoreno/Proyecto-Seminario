import { QRCodeSVG } from 'qrcode.react';
import type { OrdenQr } from '../types/pagos.types';

interface Props {
  orden: OrdenQr;
  cancelando: boolean;
  aprobando: boolean;
  onCancelar: () => void;
  onSimularAcreditacion: () => void;
}

export function ModalPagoQr({ orden, cancelando, aprobando, onCancelar, onSimularAcreditacion }: Props) {
  return (
    <div className="modal d-block" role="dialog" aria-modal="true" aria-label={orden.simulado ? 'Prueba de cobro QR' : 'Cobro Mercado Pago QR'} style={{ background: 'rgba(0,0,0,.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">{orden.simulado ? 'Prueba de cobro QR' : 'Cobro Mercado Pago QR'}</h5></div>
          <div className="modal-body text-center">
            {orden.simulado && <div className="alert alert-warning" role="status"><strong>Simulación local.</strong> Este QR es ficticio y no se paga con Mercado Pago.</div>}
            <p className="fs-4 fw-bold">${orden.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            {orden.qrData ? (
              <div className="d-inline-block p-3 bg-white border rounded"><QRCodeSVG value={orden.qrData} size={240} level="M" /></div>
            ) : <div className="spinner-border text-primary" role="status" />}
            <p className="mt-3 mb-1">{orden.estado === 'CREANDO' ? 'Preparando el QR…' : orden.simulado ? 'Pulse Simular acreditación para completar la prueba.' : 'Esperando la acreditación del pago…'}</p>
            <small className="text-muted">Vence: {new Date(orden.venceEn).toLocaleTimeString('es-AR')}</small>
            {orden.error && <p className="alert alert-warning mt-3">{orden.error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" disabled={cancelando || aprobando} onClick={onCancelar}>
              {cancelando ? 'Cancelando…' : 'Cancelar cobro'}
            </button>
            {orden.simulado && <button type="button" className="btn btn-success" disabled={cancelando || aprobando || orden.estado !== 'PENDIENTE'} onClick={onSimularAcreditacion}>
              {aprobando ? 'Acreditando…' : 'Simular acreditación'}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}
