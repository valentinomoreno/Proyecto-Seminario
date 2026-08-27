import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';
import type { PaginatedResponse, Producto } from '../types/producto.types';

export function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConsulta(buscar.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [buscar]);

  useEffect(() => {
    let active = true;
    setCargando(true);
    setError('');
    api.get<PaginatedResponse<Producto>>('/productos', { params: { buscar: consulta || undefined, page, limit: 10 } })
      .then(({ data }) => {
        if (active) { setProductos(data.data); setMeta(data.meta); }
      })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setCargando(false); });
    return () => { active = false; };
  }, [consulta, page, reloadKey]);

  async function eliminar(producto: Producto) {
    if (!window.confirm(`¿Dar de baja ${producto.nombre}?`)) return;
    try {
      await api.delete(`/productos/${producto.idProducto}`);
      if (productos.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((current) => current + 1);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">Inventario</span><h1>Catálogo de productos</h1><p>Consulte disponibilidad y ubicación física de cada repuesto.</p></div>
        {esAdmin && <Link className="button button-primary" to="/productos/nuevo">+ Nuevo producto</Link>}
      </div>
      <div className="toolbar">
        <label className="search-field"><span>⌕</span><input aria-label="Buscar productos" placeholder="Buscar por SKU, nombre o descripción…" value={buscar} onChange={(event) => setBuscar(event.target.value)} /></label>
        <span className="result-count">{meta.total} {meta.total === 1 ? 'producto' : 'productos'}</span>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="table-card">
        <table>
          <thead><tr><th>Repuesto</th><th>Categoría / Marca</th><th>Stock</th><th>Precio</th><th>Ubicación</th>{esAdmin && <th aria-label="Acciones" />}</tr></thead>
          <tbody>
            {cargando && <tr><td colSpan={esAdmin ? 6 : 5} className="empty-state">Cargando catálogo…</td></tr>}
            {!cargando && !productos.length && <tr><td colSpan={esAdmin ? 6 : 5} className="empty-state">No se encontraron productos.</td></tr>}
            {!cargando && productos.map((producto) => (
              <tr key={producto.idProducto}>
                <td><strong>{producto.nombre}</strong><small className="sku">{producto.sku}</small></td>
                <td>{producto.categoria.nombre}<small>{producto.marca.nombre}</small></td>
                <td><span className={`stock-badge ${producto.stock === 0 ? 'stock-empty' : producto.stock < 5 ? 'stock-low' : ''}`}>{producto.stock} u.</span></td>
                <td className="price">$ {producto.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td><span className="location-main">{producto.ubicacion.deposito.nombre}</span><small>{producto.ubicacion.sector.nombre} · Estante {producto.ubicacion.estante.codigo}</small></td>
                {esAdmin && <td><div className="row-actions"><Link className="icon-button" aria-label={`Editar ${producto.nombre}`} to={`/productos/${producto.idProducto}/editar`}>Editar</Link><button className="icon-button danger" onClick={() => void eliminar(producto)}>Baja</button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta.totalPages > 1 && <nav className="pagination" aria-label="Paginación"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {meta.totalPages}</span><button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></nav>}
    </section>
  );
}
