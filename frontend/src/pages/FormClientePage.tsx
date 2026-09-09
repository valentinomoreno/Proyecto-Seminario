import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { Cliente, ClientePayload } from '../types/cliente.types';

interface FormState {
  nombre: string;
  apellido: string;
  dniCuit: string;
  email: string;
  telefono: string;
}

const initialForm: FormState = {
  nombre: '',
  apellido: '',
  dniCuit: '',
  email: '',
  telefono: '',
};

export function FormClientePage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialForm);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [validacion, setValidacion] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    setCargando(true);
    api.get<Cliente>(`/clientes/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setForm({
          nombre: data.nombre,
          apellido: data.apellido,
          dniCuit: data.dniCuit,
          email: data.email,
          telefono: data.telefono ?? '',
        });
      })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [id]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validar(): string {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.apellido.trim()) return 'El apellido es obligatorio.';
    if (!form.dniCuit.trim()) return 'El DNI/CUIT es obligatorio.';
    if (!/^[0-9-]{7,15}$/.test(form.dniCuit.trim())) return 'El DNI/CUIT debe contener entre 7 y 15 dígitos (se admiten guiones).';
    if (!form.email.trim()) return 'El email es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'El email ingresado no es válido.';
    if (form.telefono.trim() && form.telefono.trim().length < 6) return 'El teléfono debe tener al menos 6 caracteres.';
    return '';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const mensajeValidacion = validar();
    setValidacion(mensajeValidacion);
    if (mensajeValidacion) return;

    setGuardando(true);
    const telefono = form.telefono.trim();
    const payload: ClientePayload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      dniCuit: form.dniCuit.trim(),
      email: form.email.trim(),
      ...(telefono ? { telefono } : {}),
    };
    try {
      if (id) await api.put(`/clientes/${id}`, payload);
      else await api.post('/clientes', payload);
      navigate('/clientes', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="card shadow-sm border-0 text-center py-5">
        <div className="card-body text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
          Cargando cliente…
        </div>
      </div>
    );
  }

  return (
    <div className="form-cliente-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas y cobranzas</li>
                <li className="breadcrumb-item">
                  <Link to="/clientes" className="text-muted">Clientes</Link>
                </li>
                <li className="breadcrumb-item active fw-semibold text-primary">
                  {editando ? 'Modificar' : 'Crear'}
                </li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/clientes" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1">
                <i className="ti ti-arrow-left" />
                <span>Volver a clientes</span>
              </Link>
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

      {validacion && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="ti ti-alert-triangle fs-5" />
          <div>{validacion}</div>
        </div>
      )}

      <form onSubmit={(event) => void submit(event)}>
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-user text-primary" />
                  <span>Datos del cliente</span>
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="input-cliente-nombre">
                      Nombre <span className="text-danger">*</span>
                    </label>
                    <input
                      id="input-cliente-nombre"
                      type="text"
                      className="form-control"
                      value={form.nombre}
                      onChange={(e) => update('nombre', e.target.value)}
                      maxLength={80}
                      required
                      placeholder="Ej. Juan"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="input-cliente-apellido">
                      Apellido <span className="text-danger">*</span>
                    </label>
                    <input
                      id="input-cliente-apellido"
                      type="text"
                      className="form-control"
                      value={form.apellido}
                      onChange={(e) => update('apellido', e.target.value)}
                      maxLength={80}
                      required
                      placeholder="Ej. Pérez"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="input-cliente-dni">
                      DNI / CUIT <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted"><i className="ti ti-id" /></span>
                      <input
                        id="input-cliente-dni"
                        type="text"
                        className="form-control"
                        value={form.dniCuit}
                        onChange={(e) => update('dniCuit', e.target.value)}
                        maxLength={15}
                        required
                        placeholder="Ej. 30123456"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="input-cliente-telefono">
                      Teléfono
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted"><i className="ti ti-phone" /></span>
                      <input
                        id="input-cliente-telefono"
                        type="tel"
                        className="form-control"
                        value={form.telefono}
                        onChange={(e) => update('telefono', e.target.value)}
                        maxLength={30}
                        placeholder="Ej. 3415551234"
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="input-cliente-email">
                      Email <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted"><i className="ti ti-mail" /></span>
                      <input
                        id="input-cliente-email"
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        maxLength={120}
                        required
                        placeholder="Ej. juan.perez@correo.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-body p-4">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold mb-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-device-floppy" />
                      <span>{editando ? 'Guardar cambios' : 'Crear cliente'}</span>
                    </>
                  )}
                </button>
                <Link to="/clientes" className="btn btn-light w-100 fw-semibold">
                  Cancelar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
