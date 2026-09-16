import type { ReactNode } from 'react';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'success' | 'danger' | 'warning';
  processing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmVariant = 'primary',
  processing = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.58)' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      aria-describedby="confirm-action-message"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold" id="confirm-action-title">
              <i className="ti ti-alert-triangle text-warning me-2" />
              {title}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel} disabled={processing} aria-label="Cerrar" />
          </div>
          <div className="modal-body py-4" id="confirm-action-message">{message}</div>
          <div className="modal-footer border-top">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={processing}>
              Cancelar
            </button>
            <button type="button" className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={processing}>
              {processing && <span className="spinner-border spinner-border-sm me-2" role="status" />}
              {processing ? 'Procesando…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
