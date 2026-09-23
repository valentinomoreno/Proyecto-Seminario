import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';

interface AlertaStock {
  idProducto: number;
  sku: string;
  nombre: string;
  categoria: string;
  marca: string;
  stockActual: number;
  stockMinimo: number;
  puntoPedido: number;
  cantidadSugerida: number;
  precioCosto: number | null;
}

interface RespuestaAlertas {
  generadoEn: string;
  total: number;
  productos: AlertaStock[];
}

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export function AlertasStockPage() {
  const [respuesta, setRespuesta] = useState<RespuestaAlertas | null>(null);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get<RespuestaAlertas>('/stock/alertas');
      setRespuesta(data);
      setCantidades(Object.fromEntries(data.productos.map((item) => [item.idProducto, item.cantidadSugerida])));
      setSeleccionados(new Set(data.productos.map((item) => item.idProducto)));
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const totalEstimado = useMemo(() => respuesta?.productos.reduce((total, item) => {
    if (!seleccionados.has(item.idProducto) || item.precioCosto === null) return total;
    return total + item.precioCosto * (cantidades[item.idProducto] ?? 0);
  }, 0) ?? 0, [respuesta, cantidades, seleccionados]);

  function alternar(idProducto: number) {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(idProducto)) siguiente.delete(idProducto); else siguiente.add(idProducto);
      return siguiente;
    });
  }

  async function exportar() {
    const items = [...seleccionados].map((idProducto) => ({ idProducto, cantidad: cantidades[idProducto] }));
    if (!items.length) return setError('Seleccione al menos un producto para exportar.');
    if (items.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 1)) {
      return setError('Todas las cantidades seleccionadas deben ser enteros mayores a cero.');
    }
    setExportando(true);
    setError('');
    try {
      const { data } = await api.post<Blob>('/stock/alertas/exportar', { items }, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sugerido-compra-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div><h4 className="fw-bold mb-1">Alertas de stock mínimo</h4><p className="text-muted mb-0">Revise las cantidades sugeridas antes de generar el documento de compra.</p></div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => void cargar()} disabled={cargando}><i className="ti ti-refresh me-1" /> Reevaluar stock</button>
          <button type="button" className="btn btn-primary" onClick={() => void exportar()} disabled={exportando || seleccionados.size === 0}><i className="ti ti-file-spreadsheet me-1" /> {exportando ? 'Generando…' : 'Generar sugerido Excel'}</button>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="dashboard-kpi-card danger"><span>Productos bajo mínimo</span><strong>{respuesta?.total ?? 0}</strong><small>stock actual ≤ stock mínimo</small></div></div>
        <div className="col-md-4"><div className="dashboard-kpi-card primary"><span>Incluidos en el documento</span><strong>{seleccionados.size}</strong><small>puede excluir filas</small></div></div>
        <div className="col-md-4"><div className="dashboard-kpi-card neutral"><span>Costo estimado</span><strong>{moneda.format(totalEstimado)}</strong><small>según costos disponibles</small></div></div>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th className="text-center">Incluir</th><th>Producto</th><th>Categoría / Marca</th><th className="text-center">Stock</th><th className="text-center">Mínimo</th><th className="text-center">Objetivo</th><th style={{ width: '170px' }}>Cantidad a comprar</th><th className="text-end">Costo estimado</th></tr></thead>
              <tbody>
                {cargando && <tr><td colSpan={8} className="text-center py-5 text-muted"><span className="spinner-border spinner-border-sm me-2" />Evaluando inventario…</td></tr>}
                {!cargando && respuesta?.productos.length === 0 && <tr><td colSpan={8} className="text-center py-5"><i className="ti ti-circle-check text-success fs-1 d-block mb-2" /><strong>Todo el inventario está por encima del mínimo.</strong><p className="text-muted mb-0">No es necesario generar una compra.</p></td></tr>}
                {!cargando && respuesta?.productos.map((item) => {
                  const cantidad = cantidades[item.idProducto] ?? item.cantidadSugerida;
                  return <tr key={item.idProducto} className={seleccionados.has(item.idProducto) ? '' : 'opacity-50'}>
                    <td className="text-center"><input type="checkbox" className="form-check-input" checked={seleccionados.has(item.idProducto)} onChange={() => alternar(item.idProducto)} aria-label={`Incluir ${item.nombre}`} /></td>
                    <td><span className="badge bg-light-primary text-primary font-monospace">{item.sku}</span><div className="fw-bold mt-1">{item.nombre}</div></td>
                    <td>{item.categoria}<small className="d-block text-muted">{item.marca}</small></td>
                    <td className="text-center"><span className="badge bg-light-danger text-danger">{item.stockActual}</span></td>
                    <td className="text-center">{item.stockMinimo}</td><td className="text-center">{item.puntoPedido}</td>
                    <td><input type="number" min="1" step="1" className="form-control" value={cantidad} disabled={!seleccionados.has(item.idProducto)} onChange={(event) => setCantidades((actual) => ({ ...actual, [item.idProducto]: Number(event.target.value) }))} /></td>
                    <td className="text-end fw-semibold">{item.precioCosto === null ? <span className="text-muted">Sin costo</span> : moneda.format(item.precioCosto * cantidad)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white d-flex justify-content-between align-items-center"><small className="text-muted">El Excel exportado conserva las cantidades editadas y queda disponible para completar el proveedor.</small><Link to="/catalogo" className="btn btn-sm btn-outline-secondary">Volver al catálogo</Link></div>
        </div>
      </div>
    </div>
  );
}
