import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { Categoria, Deposito, Estante, Marca, Producto, ProductoPayload, Sector } from '../types/producto.types';

interface FormState {
  sku: string;
  nombre: string;
  descripcion: string;
  stock: string;
  precioUnitario: string;
  costo: string;
  categoriaId: string;
  marcaId: string;
  depositoId: string;
  sectorId: string;
  estanteId: string;
}

const initialForm: FormState = {
  sku: '', nombre: '', descripcion: '', stock: '0', precioUnitario: '', costo: '',
  categoriaId: '', marcaId: '', depositoId: '', sectorId: '', estanteId: '',
};

export function FormProductoPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [estantes, setEstantes] = useState<Estante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [categoriasResponse, marcasResponse, depositosResponse] = await Promise.all([
          api.get<Categoria[]>('/categorias'), api.get<Marca[]>('/marcas'), api.get<Deposito[]>('/depositos'),
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
          setSectores(sectoresResponse.data);
          setEstantes(estantesResponse.data);
          setForm({
            sku: producto.sku,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            stock: String(producto.stock),
            precioUnitario: String(producto.precioUnitario),
            costo: producto.costo === null ? '' : String(producto.costo),
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
      sku: form.sku.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      stock: Number(form.stock),
      precioUnitario: Number(form.precioUnitario),
      costo: form.costo === '' ? null : Number(form.costo),
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

  if (cargando) return <div className="empty-state panel">Cargando formulario…</div>;

  return (
    <section className="form-page">
      <div className="page-heading">
        <div><span className="eyebrow">Inventario</span><h1>{editando ? 'Editar producto' : 'Nuevo producto'}</h1><p>Complete los datos comerciales y la ubicación física del repuesto.</p></div>
        <Link className="button button-ghost" to="/catalogo">← Volver al catálogo</Link>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="product-form" onSubmit={submit}>
        <fieldset>
          <legend><span>1</span> Información del repuesto</legend>
          <div className="form-grid">
            <label>SKU<input value={form.sku} onChange={(event) => update('sku', event.target.value)} maxLength={50} required placeholder="Ej. FIL-ACE-001" /></label>
            <label>Nombre<input value={form.nombre} onChange={(event) => update('nombre', event.target.value)} maxLength={120} required placeholder="Nombre comercial" /></label>
            <label className="span-2">Descripción<textarea value={form.descripcion} onChange={(event) => update('descripcion', event.target.value)} required rows={3} placeholder="Características principales del repuesto" /></label>
            <label>Categoría<select value={form.categoriaId} onChange={(event) => update('categoriaId', event.target.value)} required><option value="">Seleccionar</option>{categorias.map((item) => <option key={item.idCategoria} value={item.idCategoria}>{item.nombre}</option>)}</select></label>
            <label>Marca<select value={form.marcaId} onChange={(event) => update('marcaId', event.target.value)} required><option value="">Seleccionar</option>{marcas.map((item) => <option key={item.idMarca} value={item.idMarca}>{item.nombre}</option>)}</select></label>
          </div>
        </fieldset>
        <fieldset>
          <legend><span>2</span> Stock y valores</legend>
          <div className="form-grid form-grid-3">
            <label>Stock actual<input type="number" min="0" step="1" value={form.stock} onChange={(event) => update('stock', event.target.value)} required /></label>
            <label>Precio unitario ($)<input type="number" min="0.01" step="0.01" value={form.precioUnitario} onChange={(event) => update('precioUnitario', event.target.value)} required /></label>
            <label>Costo ($) <small>Opcional</small><input type="number" min="0" step="0.01" value={form.costo} onChange={(event) => update('costo', event.target.value)} /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend><span>3</span> Ubicación física</legend>
          <div className="form-grid form-grid-3">
            <label>Depósito<select value={form.depositoId} onChange={(event) => void selectDeposito(event.target.value)} required><option value="">Seleccionar</option>{depositos.map((item) => <option key={item.idDeposito} value={item.idDeposito}>{item.nombre}</option>)}</select></label>
            <label>Sector<select value={form.sectorId} onChange={(event) => void selectSector(event.target.value)} disabled={!form.depositoId} required><option value="">Seleccionar</option>{sectores.map((item) => <option key={item.idSector} value={item.idSector}>{item.nombre}</option>)}</select></label>
            <label>Estante<select value={form.estanteId} onChange={(event) => update('estanteId', event.target.value)} disabled={!form.sectorId} required><option value="">Seleccionar</option>{estantes.map((item) => <option key={item.idEstante} value={item.idEstante}>{item.codigo}</option>)}</select></label>
          </div>
        </fieldset>
        <div className="form-actions"><Link className="button button-ghost" to="/catalogo">Cancelar</Link><button className="button button-primary" disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear producto'}</button></div>
      </form>
    </section>
  );
}
