import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../api/axios.instance';
import { clientesApi } from '../api/clientes.service';
import type { Cliente, CondicionIva } from '../types/cliente.types';

interface Props {
  onClose: () => void;
  onClienteCreado: (cliente: Cliente) => void;
}

export function ModalNuevoCliente({ onClose, onClienteCreado }: Props) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [cuil, setCuil] = useState('');
  const [condicionIva, setCondicionIva] = useState<CondicionIva>('CONSUMIDOR_FINAL');
  const [cuentaCorrienteHabilitada, setCuentaCorrienteHabilitada] = useState(false);
  const [limiteCredito, setLimiteCredito] = useState(100000);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      const nuevo = await clientesApi.createCliente({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        cuil: cuil.trim(),
        condicionIva,
        cuentaCorrienteHabilitada,
        limiteCredito: cuentaCorrienteHabilitada ? Number(limiteCredito) : 0,
      });
      onClienteCreado(nuevo);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              <i className="ti ti-user-plus me-2" />
              Nuevo Cliente
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Cerrar" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label fw-semibold">Nombre *</label>
                  <input
                    className="form-control"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan"
                    autoFocus
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label fw-semibold">Apellido / Razón Social *</label>
                  <input
                    className="form-control"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej. Pérez"
                  />
                </div>

                <div className="col-sm-6">
                  <label className="form-label fw-semibold">DNI *</label>
                  <input
                    className="form-control"
                    required
                    maxLength={8}
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="8 dígitos"
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label fw-semibold">CUIL / CUIT *</label>
                  <input
                    className="form-control"
                    required
                    maxLength={11}
                    value={cuil}
                    onChange={(e) => setCuil(e.target.value.replace(/\D/g, ''))}
                    placeholder="11 dígitos (sin guiones)"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">Condición frente al IVA *</label>
                  <select
                    className="form-select"
                    value={condicionIva}
                    onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
                  >
                    <option value="CONSUMIDOR_FINAL">Consumidor Final (Factura B)</option>
                    <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto (Factura A)</option>
                    <option value="MONOTRIBUTO">Monotributista (Factura B)</option>
                    <option value="EXENTO">Exento (Factura C)</option>
                  </select>
                </div>

                <div className="col-12">
                  <div className="form-check form-switch p-2 bg-light rounded border">
                    <input
                      className="form-check-input ms-0 me-2"
                      type="checkbox"
                      id="checkCtaCte"
                      checked={cuentaCorrienteHabilitada}
                      onChange={(e) => setCuentaCorrienteHabilitada(e.target.checked)}
                    />
                    <label className="form-check-label fw-bold" htmlFor="checkCtaCte">
                      Habilitar Cuenta Corriente
                    </label>
                  </div>
                </div>

                {cuentaCorrienteHabilitada && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">Límite de Crédito ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      className="form-control"
                      value={limiteCredito}
                      onChange={(e) => setLimiteCredito(Number(e.target.value))}
                    />
                    <small className="text-muted">Monto máximo permitido en compras a plazo.</small>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={enviando}>
                {enviando ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" /> Guardando...
                  </>
                ) : (
                  <>
                    <i className="ti ti-check" /> Guardar y Seleccionar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
