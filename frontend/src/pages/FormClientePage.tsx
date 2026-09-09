import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type {
  Cliente,
  CondicionIva,
  CreateClienteEmpresaPayload,
  CreateClientePersonaPayload,
  TipoCliente,
} from '../types/cliente.types';

interface FormState {
  tipo: TipoCliente;
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  cuit: string;
  razonSocial: string;
  personaContacto: string;
  condicionIvaId: string;
  telefono: string;
  correo: string;
  direccion: string;
}

const initialForm: FormState = {
  tipo: 'PERSONA',
  nombre: '',
  apellido: '',
  dni: '',
  cuil: '',
  cuit: '',
  razonSocial: '',
  personaContacto: '',
  condicionIvaId: '',
  telefono: '',
  correo: '',
  direccion: '',
};

export function FormClientePage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [condiciones, setCondiciones] = useState<CondicionIva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const condicionesResponse = await api.get<CondicionIva[]>('/condiciones-iva');
        if (!active) return;
        setCondiciones(condicionesResponse.data);
        if (id) {
          const { data: cliente } = await api.get<Cliente>(`/clientes/${id}`);
          if (!active) return;
          setForm({
            tipo: cliente.tipo,
            nombre: cliente.persona?.nombre ?? '',
            apellido: cliente.persona?.apellido ?? '',
            dni: cliente.persona?.dni ?? '',
            cuil: cliente.persona?.cuil ?? '',
            cuit: cliente.empresa?.cuit ?? '',
            razonSocial: cliente.empresa?.razonSocial ?? '',
            personaContacto: cliente.empresa?.personaContacto ?? '',
            condicionIvaId: String(cliente.condicionIva.idCondicionIva),
            telefono: cliente.contacto.telefono ?? '',
            correo: cliente.contacto.correo ?? '',
            direccion: cliente.contacto.direccion ?? '',
          });
        }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setCargando(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    const contacto = {
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
      direccion: form.direccion.trim() || null,
    };

    try {
      if (id) {
        await api.put(`/clientes/${id}`, contacto);
      } else if (form.tipo === 'PERSONA') {
        const payload: CreateClientePersonaPayload = {
          ...contacto,
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          dni: form.dni.trim(),
          cuil: form.cuil.trim(),
          condicionIvaId: Number(form.condicionIvaId),
        };
        await api.post('/clientes/persona', payload);
      } else {
        const payload: CreateClienteEmpresaPayload = {
          ...contacto,
          cuit: form.cuit.trim(),
          razonSocial: form.razonSocial.trim(),
          personaContacto: form.personaContacto.trim(),
          condicionIvaId: Number(form.condicionIvaId),
        };
        await api.post('/clientes/empresa', payload);
      }
      navigate('/clientes', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="card shadow-sm border-0 text-center py-5"><div className="card-body text-muted"><span className="spinner-border spinner-border-sm text-primary me-2" />Cargando formulario…</div></div>;
  }

  const condicionSeleccionada = condiciones.find((item) => String(item.idCondicionIva) === form.condicionIvaId);

  return (
    <div className="form-cliente-datta-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title"><h4 className="mb-1 fw-bold">{editando ? 'Editar contacto del cliente' : 'Nuevo cliente'}</h4></div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Ventas</li>
                <li className="breadcrumb-item"><Link to="/clientes" className="text-muted">Clientes</Link></li>
                <li className="breadcrumb-item active fw-semibold text-primary">{editando ? 'Modificar' : 'Crear'}</li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/clientes" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1" />Volver a clientes</Link>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert"><i className="ti ti-alert-circle me-2" />{error}</div>}

      <form onSubmit={(event) => void submit(event)}>
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0"><i className="ti ti-id me-2 text-primary" />Identificación</h6>
              </div>
              <div className="card-body p-4">
                {!editando && (
                  <fieldset className="mb-4">
                    <legend className="form-label fw-semibold fs-6">Tipo de cliente</legend>
                    <div className="btn-group" role="group" aria-label="Tipo de cliente">
                      <input className="btn-check" type="radio" name="tipo" id="tipo-persona" checked={form.tipo === 'PERSONA'} onChange={() => update('tipo', 'PERSONA')} />
                      <label className="btn btn-outline-primary" htmlFor="tipo-persona"><i className="ti ti-user me-1" />Particular</label>
                      <input className="btn-check" type="radio" name="tipo" id="tipo-empresa" checked={form.tipo === 'EMPRESA'} onChange={() => update('tipo', 'EMPRESA')} />
                      <label className="btn btn-outline-primary" htmlFor="tipo-empresa"><i className="ti ti-building me-1" />Empresa</label>
                    </div>
                  </fieldset>
                )}

                {form.tipo === 'PERSONA' ? (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" htmlFor="nombre">Nombre <span className="text-danger">*</span></label>
                      <input id="nombre" className="form-control" value={form.nombre} onChange={(event) => update('nombre', event.target.value)} maxLength={80} required disabled={editando} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" htmlFor="apellido">Apellido <span className="text-danger">*</span></label>
                      <input id="apellido" className="form-control" value={form.apellido} onChange={(event) => update('apellido', event.target.value)} maxLength={80} required disabled={editando} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" htmlFor="dni">DNI <span className="text-danger">*</span></label>
                      <input id="dni" className="form-control font-monospace" value={form.dni} onChange={(event) => update('dni', event.target.value)} placeholder="12345678" required disabled={editando} />
                      {!editando && <div className="form-text">7 u 8 dígitos.</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" htmlFor="cuil">CUIL <span className="text-danger">*</span></label>
                      <input id="cuil" className="form-control font-monospace" value={form.cuil} onChange={(event) => update('cuil', event.target.value)} placeholder="20-12345678-6" required disabled={editando} />
                    </div>
                  </div>
                ) : (
                  <div className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label fw-semibold" htmlFor="razon-social">Razón social <span className="text-danger">*</span></label>
                      <input id="razon-social" className="form-control" value={form.razonSocial} onChange={(event) => update('razonSocial', event.target.value)} maxLength={160} required disabled={editando} />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label fw-semibold" htmlFor="cuit">CUIT <span className="text-danger">*</span></label>
                      <input id="cuit" className="form-control font-monospace" value={form.cuit} onChange={(event) => update('cuit', event.target.value)} placeholder="30-12345678-0" required disabled={editando} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold" htmlFor="persona-contacto">Persona de contacto <span className="text-danger">*</span></label>
                      <input id="persona-contacto" className="form-control" value={form.personaContacto} onChange={(event) => update('personaContacto', event.target.value)} maxLength={160} required disabled={editando} />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="form-label fw-semibold" htmlFor="condicion-iva">Condición de IVA <span className="text-danger">*</span></label>
                  {editando ? (
                    <input id="condicion-iva" className="form-control" value={condicionSeleccionada?.nombre ?? ''} disabled />
                  ) : (
                    <select id="condicion-iva" className="form-select" value={form.condicionIvaId} onChange={(event) => update('condicionIvaId', event.target.value)} required>
                      <option value="">Seleccionar condición fiscal</option>
                      {condiciones.map((condicion) => <option key={condicion.idCondicionIva} value={condicion.idCondicionIva}>{condicion.nombre}</option>)}
                    </select>
                  )}
                </div>
                {editando && <div className="alert alert-light border mt-4 mb-0 small"><i className="ti ti-lock me-2" />Durante este sprint, los datos fiscales y de identidad son de solo lectura.</div>}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom"><h6 className="card-title fw-bold m-0"><i className="ti ti-address-book me-2 text-success" />Datos de contacto</h6></div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="telefono">Teléfono</label>
                  <input id="telefono" type="tel" className="form-control" value={form.telefono} onChange={(event) => update('telefono', event.target.value)} maxLength={40} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="correo">Correo electrónico</label>
                  <input id="correo" type="email" className="form-control" value={form.correo} onChange={(event) => update('correo', event.target.value)} maxLength={160} />
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="direccion">Dirección</label>
                  <textarea id="direccion" className="form-control" rows={3} value={form.direccion} onChange={(event) => update('direccion', event.target.value)} maxLength={200} />
                </div>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2" disabled={guardando}>
              {guardando && <span className="spinner-border spinner-border-sm me-2" />}
              <i className="ti ti-device-floppy me-1" />{editando ? 'Guardar contacto' : 'Registrar cliente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
