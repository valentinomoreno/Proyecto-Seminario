import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getApiErrorMessage } from '../api/axios.instance';
import { descargarCsv, reportesApi, type Periodo, type RankingProducto } from '../api/reportes.service';
import { FiltroPeriodoReportes } from '../components/FiltroPeriodoReportes';
import type { Categoria } from '../types/producto.types';

function inicial(): Periodo {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1);
  const formato = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { desde: formato(desde), hasta: formato(hoy) };
}

export function RankingProductosPage() {
  const [periodo, setPeriodo] = useState(inicial);
  const [categoria, setCategoria] = useState<number | undefined>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filas, setFilas] = useState<RankingProducto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const buscar = useCallback(async (filtro: Periodo, idCategoria?: number) => {
    setCargando(true); setError('');
    try { setFilas((await reportesApi.rankingProductos(filtro, idCategoria)).data); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => {
    void buscar(inicial());
    void api.get<Categoria[]>('/categorias').then(({ data }) => setCategorias(data)).catch(() => undefined);
  }, [buscar]);

  return <div className="container-fluid report-page">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div><span className="dashboard-eyebrow">INFORMES</span><h1 className="dashboard-hero-title mb-1">Ranking de productos</h1><p className="text-muted mb-0">Los repuestos con más unidades vendidas en el período.</p></div>
      <button className="btn btn-outline-primary" disabled={!filas.length} onClick={() => descargarCsv('ranking-productos.csv',
        ['SKU', 'Producto', 'Categoría', 'Unidades netas', 'Recaudación neta'],
        filas.map((f) => [f.sku, f.nombre, f.categoria, f.cantidad, f.recaudacion]))}>Exportar CSV</button>
    </div>
    <div className="d-flex flex-wrap gap-3 align-items-end">
      <FiltroPeriodoReportes periodo={periodo} onChange={setPeriodo} onBuscar={() => void buscar(periodo, categoria)} cargando={cargando} />
      <label className="form-label mb-4">Categoría
        <select className="form-select" value={categoria ?? ''} onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todas</option>{categorias.map((c) => <option value={c.idCategoria} key={c.idCategoria}>{c.nombre}</option>)}
        </select>
      </label>
    </div>
    {error && <div className="alert alert-danger">{error}</div>}
    {!cargando && !filas.length && !error && <p className="text-muted">No hay movimientos en el período.</p>}
    {!!filas.length && <>
      <div className="card mb-4"><div className="card-body" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={filas.slice(0, 10)} layout="vertical" margin={{ left: 70 }}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="nombre" type="category" width={125} />
          <Tooltip /><Bar dataKey="cantidad" name="Unidades netas" fill="#7659d5" radius={[0, 5, 5, 0]} />
        </BarChart></ResponsiveContainer>
      </div></div>
      <div className="table-responsive"><table className="table table-striped"><thead><tr><th>#</th><th>SKU</th><th>Producto</th><th>Categoría</th><th>Unidades netas</th><th>Recaudación neta</th></tr></thead>
        <tbody>{filas.map((f, i) => <tr key={f.idProducto}><td>{i + 1}</td><td>{f.sku}</td><td>{f.nombre}</td><td>{f.categoria}</td><td>{f.cantidad}</td><td>{f.recaudacion.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</td></tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}
