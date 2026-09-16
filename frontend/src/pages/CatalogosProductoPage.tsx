import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import type { Categoria, Marca } from '../types/producto.types';

export function CatalogosProductoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [nombreCategoria, setNombreCategoria] = useState('');
  const [descripcionCategoria, setDescripcionCategoria] = useState('');
  const [nombreMarca, setNombreMarca] = useState('');
  const [categoriaIds, setCategoriaIds] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<'categoria' | 'marca' | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [eliminarPendiente, setEliminarPendiente] = useState<{ tipo: 'categorias' | 'marcas'; id: number; nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [categoriasResponse, marcasResponse] = await Promise.all([
        api.get<Categoria[]>('/categorias'),
        api.get<Marca[]>('/marcas'),
      ]);
      setCategorias(categoriasResponse.data);
      setMarcas(marcasResponse.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos]);

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categorias],
  );

  const guardarCategoria = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando('categoria');
    setError('');
    setMensaje('');
    try {
      await api.post('/categorias', {
        nombre: nombreCategoria.trim(),
        descripcion: descripcionCategoria.trim() || undefined,
      });
      setNombreCategoria('');
      setDescripcionCategoria('');
      setMensaje('Categoría creada correctamente.');
      await cargarCatalogos();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(null);
    }
  };

  const guardarMarca = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando('marca');
    setError('');
    setMensaje('');
    try {
      await api.post('/marcas', { nombre: nombreMarca.trim(), categoriaIds });
      setNombreMarca('');
      setCategoriaIds([]);
      setMensaje('Marca creada y asociada correctamente.');
      await cargarCatalogos();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(null);
    }
  };

  const eliminar = async (tipo: 'categorias' | 'marcas', id: number) => {
    setEliminando(true);
    setError('');
    setMensaje('');
    try {
      await api.delete(`/${tipo}/${id}`);
      setEliminarPendiente(null);
      setMensaje(`${tipo === 'categorias' ? 'Categoría' : 'Marca'} eliminada correctamente.`);
      await cargarCatalogos();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setEliminando(false);
    }
  };

  const alternarCategoria = (id: number) => {
    setCategoriaIds((actuales) => (
      actuales.includes(id) ? actuales.filter((actual) => actual !== id) : [...actuales, id]
    ));
  };

  return (
    <div className="catalogos-producto-view">
      <div className="page-header mb-4">
        <div className="page-block">
          <h4 className="mb-1 fw-bold">Categorías y Marcas</h4>
          <p className="text-muted mb-0">
            Administrá la clasificación del catálogo. Las marcas se vinculan con las categorías en las que se utilizan.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0"><i className="ti ti-category me-2 text-primary" />Nueva categoría</h5>
            </div>
            <form className="card-body" onSubmit={guardarCategoria}>
              <label className="form-label fw-semibold" htmlFor="nombre-categoria">Nombre *</label>
              <input
                id="nombre-categoria"
                className="form-control mb-3"
                maxLength={80}
                value={nombreCategoria}
                onChange={(event) => setNombreCategoria(event.target.value)}
                placeholder="Ej.: Suspensión y dirección"
                required
              />
              <label className="form-label fw-semibold" htmlFor="descripcion-categoria">Descripción</label>
              <textarea
                id="descripcion-categoria"
                className="form-control mb-3"
                rows={3}
                maxLength={240}
                value={descripcionCategoria}
                onChange={(event) => setDescripcionCategoria(event.target.value)}
                placeholder="Qué tipo de repuestos agrupa esta categoría"
              />
              <button className="btn btn-primary" disabled={guardando !== null || !nombreCategoria.trim()}>
                {guardando === 'categoria' ? 'Guardando…' : 'Crear categoría'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0"><i className="ti ti-tag me-2 text-primary" />Nueva marca</h5>
            </div>
            <form className="card-body" onSubmit={guardarMarca}>
              <label className="form-label fw-semibold" htmlFor="nombre-marca">Nombre *</label>
              <input
                id="nombre-marca"
                className="form-control mb-3"
                maxLength={80}
                value={nombreMarca}
                onChange={(event) => setNombreMarca(event.target.value)}
                placeholder="Ej.: SKF"
                required
              />
              <fieldset>
                <legend className="form-label fw-semibold fs-6">Categorías donde se utiliza *</legend>
                <div className="border rounded p-3 mb-3 overflow-auto" style={{ maxHeight: 170 }}>
                  {!categoriasOrdenadas.length && <span className="text-muted small">Primero creá una categoría.</span>}
                  {categoriasOrdenadas.map((categoria) => (
                    <div className="form-check" key={categoria.idCategoria}>
                      <input
                        id={`marca-categoria-${categoria.idCategoria}`}
                        className="form-check-input"
                        type="checkbox"
                        checked={categoriaIds.includes(categoria.idCategoria)}
                        onChange={() => alternarCategoria(categoria.idCategoria)}
                      />
                      <label className="form-check-label" htmlFor={`marca-categoria-${categoria.idCategoria}`}>
                        {categoria.nombre}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
              <button
                className="btn btn-primary"
                disabled={guardando !== null || !nombreMarca.trim() || categoriaIds.length === 0}
              >
                {guardando === 'marca' ? 'Guardando…' : 'Crear marca'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Categorías</h5>
              <span className="badge bg-light-primary text-primary">{categorias.length}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Nombre</th><th>Marcas</th><th /></tr></thead>
                <tbody>
                  {cargando && <tr><td colSpan={3} className="text-center py-4 text-muted">Cargando…</td></tr>}
                  {!cargando && categoriasOrdenadas.map((categoria) => (
                    <tr key={categoria.idCategoria}>
                      <td><strong>{categoria.nombre}</strong><div className="small text-muted">{categoria.descripcion || 'Sin descripción'}</div></td>
                      <td><span className="badge bg-light-secondary text-secondary">{categoria.marcas?.length ?? 0}</span></td>
                      <td className="text-end"><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Eliminar ${categoria.nombre}`} onClick={() => setEliminarPendiente({ tipo: 'categorias', id: categoria.idCategoria, nombre: categoria.nombre })}><i className="ti ti-trash" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Marcas</h5>
              <span className="badge bg-light-primary text-primary">{marcas.length}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Nombre</th><th>Categorías asociadas</th><th /></tr></thead>
                <tbody>
                  {cargando && <tr><td colSpan={3} className="text-center py-4 text-muted">Cargando…</td></tr>}
                  {!cargando && marcas.map((marca) => (
                    <tr key={marca.idMarca}>
                      <td><strong>{marca.nombre}</strong></td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {marca.categorias?.map((categoria) => <span className="badge bg-light-info text-info" key={categoria.idCategoria}>{categoria.nombre}</span>)}
                        </div>
                      </td>
                      <td className="text-end"><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Eliminar ${marca.nombre}`} onClick={() => setEliminarPendiente({ tipo: 'marcas', id: marca.idMarca, nombre: marca.nombre })}><i className="ti ti-trash" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={eliminarPendiente !== null}
        title={`¿Eliminar ${eliminarPendiente?.tipo === 'categorias' ? 'la categoría' : 'la marca'}?`}
        message={<p className="mb-0">Se eliminará <strong>{eliminarPendiente?.nombre}</strong>. La operación será rechazada si todavía tiene productos activos.</p>}
        confirmLabel="Sí, eliminar"
        confirmVariant="danger"
        processing={eliminando}
        onCancel={() => setEliminarPendiente(null)}
        onConfirm={() => { if (eliminarPendiente) void eliminar(eliminarPendiente.tipo, eliminarPendiente.id); }}
      />
    </div>
  );
}
