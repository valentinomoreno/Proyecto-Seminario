import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { Categoria, Deposito, Estante, Marca, Producto, ProductoPayload, Sector } from '../types/producto.types';

interface FormState {
  nombre: string;
  descripcion: string;
  stock: string;
  precioUnitario: string;
  imagenUrl: string;
  categoriaId: string;
  marcaId: string;
  depositoId: string;
  sectorId: string;
  estanteId: string;
}

const initialForm: FormState = {
  nombre: '',
  descripcion: '',
  stock: '0',
  precioUnitario: '',
  imagenUrl: '',
  categoriaId: '',
  marcaId: '',
  depositoId: '',
  sectorId: '',
  estanteId: '',
};

export function FormProductoPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [codigoActual, setCodigoActual] = useState<string>('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [estantes, setEstantes] = useState<Estante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [categoriasResponse, marcasResponse, depositosResponse] = await Promise.all([
          api.get<Categoria[]>('/categorias'),
          api.get<Marca[]>('/marcas'),
          api.get<Deposito[]>('/depositos'),
        ]);
        if (!active) return;
        setCategorias(categoriasResponse.data);
        setMarcas(marcasResponse.data);
        setDepositos(depositosResponse.data);

        if (id) {
          const { data: producto } = await api.get<Producto>(`/productos/${id}`);
          const [sectoresResponse, estantesResponse] = await Promise.all([
            api.get<Sector[]>('/sectores', { params: { depositoId: producto.ubicacion.deposito.idDeposito } }),
            api.get<Estante[]>('/estantes', { params: { sectorId: producto.ubicacion.sector.idSector } }),
          ]);
          if (!active) return;
          setCodigoActual(producto.sku);
          setSectores(sectoresResponse.data);
          setEstantes(estantesResponse.data);
          setForm({
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            stock: String(producto.stock),
            precioUnitario: String(producto.precioUnitario),
            imagenUrl: producto.imagenUrl ?? '',
            categoriaId: String(producto.categoria.idCategoria),
            marcaId: String(producto.marca.idMarca),
            depositoId: String(producto.ubicacion.deposito.idDeposito),
            sectorId: String(producto.ubicacion.sector.idSector),
            estanteId: String(producto.ubicacion.estante.idEstante),
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

  async function handleFotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setSubiendoFoto(true);
    const formData = new FormData();
    formData.append('foto', file);
    try {
      const { data } = await api.post<{ url: string }>('/productos/upload-foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      update('imagenUrl', data.url);
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setSubiendoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function eliminarFoto() {
    update('imagenUrl', '');
  }

  async function selectDeposito(depositoId: string) {
    setForm((current) => ({ ...current, depositoId, sectorId: '', estanteId: '' }));
    setEstantes([]);
    if (!depositoId) return setSectores([]);
    try {
      const { data } = await api.get<Sector[]>('/sectores', { params: { depositoId } });
      setSectores(data);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  async function selectSector(sectorId: string) {
    setForm((current) => ({ ...current, sectorId, estanteId: '' }));
    if (!sectorId) return setEstantes([]);
    try {
      const { data } = await api.get<Estante[]>('/estantes', { params: { sectorId } });
      setEstantes(data);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setError('');
    const payload: ProductoPayload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      stock: Number(form.stock),
      precioUnitario: Number(form.precioUnitario),
      imagenUrl: form.imagenUrl.trim() || null,
      categoriaId: Number(form.categoriaId),
      marcaId: Number(form.marcaId),
      estanteId: Number(form.estanteId),
    };
    try {
      if (id) await api.put(`/productos/${id}`, payload);
      else await api.post('/productos', payload);
      navigate('/catalogo', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(false);
    }
  }

  const backendBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  const fullFotoUrl = form.imagenUrl
    ? form.imagenUrl.startsWith('http')
      ? form.imagenUrl
      : `${backendBaseUrl}${form.imagenUrl}`
    : null;

  if (cargando) {
    return (
      <div className="card shadow-sm border-0 text-center py-5">
        <div className="card-body text-muted">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
          Cargando formulario…
        </div>
      </div>
    );
  }

  return (
    <div className="form-producto-datta-view">
      {/* PAGE HEADER */}
      <div className="page-header mb-4">
        <div className="page-block">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="page-header-title">
                <h4 className="mb-1 fw-bold">
                  {editando ? 'Editar Repuesto' : 'Nuevo Repuesto'}
                  {editando && codigoActual && (
                    <span className="badge bg-light-primary text-primary font-monospace ms-2 fs-6">
                      {codigoActual}
                    </span>
                  )}
                </h4>
              </div>
              <ul className="breadcrumb m-0 bg-transparent p-0 small">
                <li className="breadcrumb-item text-muted">Inventario</li>
                <li className="breadcrumb-item">
                  <Link to="/catalogo" className="text-muted">Catálogo</Link>
                </li>
                <li className="breadcrumb-item active fw-semibold text-primary">
                  {editando ? 'Modificar' : 'Crear'}
                </li>
              </ul>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <Link to="/catalogo" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1">
                <i className="ti ti-arrow-left" />
                <span>Volver al catálogo</span>
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

      <form onSubmit={submit}>
        <div className="row g-4">
          {/* SECCIÓN 1: DATOS COMERCIALES */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-info-circle text-primary" />
                  <span>1. Información del repuesto</span>
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="input-nombre">
                      Nombre comercial <span className="text-danger">*</span>
                    </label>
                    <input
                      id="input-nombre"
                      type="text"
                      className="form-control"
                      value={form.nombre}
                      onChange={(e) => update('nombre', e.target.value)}
                      maxLength={120}
                      required
                      placeholder="Ej. Filtro de aceite premium"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="select-categoria">
                      Categoría <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-categoria"
                      className="form-select"
                      value={form.categoriaId}
                      onChange={(e) => update('categoriaId', e.target.value)}
                      required
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((item) => (
                        <option key={item.idCategoria} value={item.idCategoria}>{item.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="select-marca">
                      Marca <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-marca"
                      className="form-select"
                      value={form.marcaId}
                      onChange={(e) => update('marcaId', e.target.value)}
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {marcas.map((item) => (
                        <option key={item.idMarca} value={item.idMarca}>{item.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="textarea-descripcion">
                      Descripción <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="textarea-descripcion"
                      className="form-control"
                      value={form.descripcion}
                      onChange={(e) => update('descripcion', e.target.value)}
                      required
                      rows={3}
                      maxLength={2000}
                      placeholder="Características principales, compatibilidad y especificaciones técnicas"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: STOCK Y PRECIO */}
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-coin text-success" />
                  <span>2. Stock y Precio</span>
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="input-stock">
                      Stock actual (unidades) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted"><i className="ti ti-packages" /></span>
                      <input
                        id="input-stock"
                        type="number"
                        min="0"
                        step="1"
                        className="form-control"
                        value={form.stock}
                        onChange={(e) => update('stock', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="input-precio">
                      Precio unitario ($) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">$</span>
                      <input
                        id="input-precio"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="form-control"
                        value={form.precioUnitario}
                        onChange={(e) => update('precioUnitario', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: UBICACIÓN FÍSICA */}
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-map-pin text-warning" />
                  <span>3. Ubicación física en depósito</span>
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" htmlFor="select-deposito">
                      Depósito <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-deposito"
                      className="form-select"
                      value={form.depositoId}
                      onChange={(e) => void selectDeposito(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar</option>
                      {depositos.map((item) => (
                        <option key={item.idDeposito} value={item.idDeposito}>{item.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold" htmlFor="select-sector">
                      Sector <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-sector"
                      className="form-select"
                      value={form.sectorId}
                      onChange={(e) => void selectSector(e.target.value)}
                      disabled={!form.depositoId}
                      required
                    >
                      <option value="">Seleccionar</option>
                      {sectores.map((item) => (
                        <option key={item.idSector} value={item.idSector}>{item.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold" htmlFor="select-estante">
                      Estante <span className="text-danger">*</span>
                    </label>
                    <select
                      id="select-estante"
                      className="form-select"
                      value={form.estanteId}
                      onChange={(e) => update('estanteId', e.target.value)}
                      disabled={!form.sectorId}
                      required
                    >
                      <option value="">Seleccionar</option>
                      {estantes.map((item) => (
                        <option key={item.idEstante} value={item.idEstante}>{item.codigo}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN LATERAL: FOTO Y ACCIONES */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="card-title fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="ti ti-photo text-info" />
                  <span>Foto del producto</span>
                </h6>
              </div>
              <div className="card-body p-4 text-center">
                {fullFotoUrl ? (
                  <div className="datta-photo-preview-box mb-3">
                    <img src={fullFotoUrl} alt="Vista previa" className="img-fluid rounded-3 shadow-sm mb-3" style={{ maxHeight: '180px', objectFit: 'contain' }} />
                    <div className="d-flex gap-2 justify-content-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={subiendoFoto}
                      >
                        {subiendoFoto ? 'Subiendo…' : 'Cambiar foto'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={eliminarFoto}
                        disabled={subiendoFoto}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="datta-dropzone p-4 rounded-3 border-2 border-dashed bg-light text-center cursor-pointer mb-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="ti ti-cloud-upload fs-1 text-muted d-block mb-2" />
                    <p className="fw-semibold mb-1 small">
                      {subiendoFoto ? 'Subiendo imagen…' : 'Haga clic para seleccionar foto'}
                    </p>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>JPG, PNG, WebP (máx. 5 MB)</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => void handleFotoChange(e)}
                />
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-body p-4">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold mb-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={guardando || subiendoFoto}
                >
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-device-floppy" />
                      <span>{editando ? 'Guardar cambios' : 'Crear repuesto'}</span>
                    </>
                  )}
                </button>
                <Link to="/catalogo" className="btn btn-light w-100 fw-semibold">
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
