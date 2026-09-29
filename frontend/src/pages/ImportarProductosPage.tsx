import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type {
  EstadoFilaImportacionProducto,
  HistorialImportacionProducto,
  PrevisualizacionImportacionProductos,
  ResultadoImportacionProductos,
} from '../types/producto.types';

const ESTADOS: Array<{ estado: EstadoFilaImportacionProducto | 'TODOS'; etiqueta: string }> = [
  { estado: 'TODOS', etiqueta: 'Todas' },
  { estado: 'NUEVO', etiqueta: 'Nuevos' },
  { estado: 'ACTUALIZAR', etiqueta: 'A actualizar' },
  { estado: 'SIN_CAMBIOS', etiqueta: 'Sin cambios' },
  { estado: 'ERROR', etiqueta: 'Con errores' },
];

const ETIQUETAS_CAMPOS: Record<string, string> = {
  nombre: 'Nombre',
  descripcion: 'Descripción',
  precioCosto: 'Precio de costo',
  precioUnitario: 'Precio de venta',
  stock: 'Stock',
  stockMinimo: 'Stock mínimo',
  puntoPedido: 'Punto de pedido',
  categoria: 'Categoría',
  marca: 'Marca',
  estante: 'Estante',
};

function claseEstado(estado: EstadoFilaImportacionProducto): string {
  return {
    NUEVO: 'bg-light-success text-success',
    ACTUALIZAR: 'bg-light-primary text-primary',
    SIN_CAMBIOS: 'bg-light-secondary text-secondary',
    ERROR: 'bg-light-danger text-danger',
  }[estado];
}

export function ImportarProductosPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState<PrevisualizacionImportacionProductos | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacionProductos | null>(null);
  const [historial, setHistorial] = useState<HistorialImportacionProducto[]>([]);
  const [filtro, setFiltro] = useState<EstadoFilaImportacionProducto | 'TODOS'>('TODOS');
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void cargarHistorial();
  }, []);

  const filasVisibles = useMemo(() => {
    if (!previsualizacion) return [];
    return filtro === 'TODOS'
      ? previsualizacion.filas
      : previsualizacion.filas.filter((fila) => fila.estado === filtro);
  }, [filtro, previsualizacion]);

  async function cargarHistorial() {
    try {
      const { data } = await api.get<HistorialImportacionProducto[]>('/productos/importaciones');
      setHistorial(data);
    } catch {
      // El historial no bloquea el flujo principal de importación.
    }
  }

  async function descargarPlantilla() {
    setDescargando(true);
    setError('');
    try {
      const { data } = await api.get<Blob>('/productos/importacion/plantilla', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla-estandar-productos.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setDescargando(false);
    }
  }

  async function analizarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const seleccionado = event.target.files?.[0];
    if (!seleccionado) return;
    setArchivo(seleccionado);
    setPrevisualizacion(null);
    setResultado(null);
    setFiltro('TODOS');
    setAnalizando(true);
    setError('');
    const formData = new FormData();
    formData.append('archivo', seleccionado);
    try {
      const { data } = await api.post<PrevisualizacionImportacionProductos>(
        '/productos/importacion/previsualizar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setPrevisualizacion(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setArchivo(null);
    } finally {
      setAnalizando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function confirmarImportacion() {
    if (!archivo || !previsualizacion) return;
    setConfirmando(true);
    setError('');
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('token', previsualizacion.token);
    try {
      const { data } = await api.post<ResultadoImportacionProductos>(
        '/productos/importacion/confirmar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setResultado(data);
      setPrevisualizacion(null);
      setArchivo(null);
      await cargarHistorial();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="importar-productos-page">
      <div className="page-header mb-4">
        <div className="page-block d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="mb-1 fw-bold">Importar productos</h4>
            <p className="text-muted mb-0">Previsualizá altas, actualizaciones y errores antes de modificar el inventario.</p>
          </div>
          <Link to="/catalogo" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1" />Volver al catálogo</Link>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100"><div className="card-body p-4 d-flex gap-3 align-items-start">
            <span className="badge rounded-circle bg-light-primary text-primary p-3 fs-5">1</span>
            <div className="flex-grow-1">
              <h5 className="fw-bold">Descargar la plantilla estándar</h5>
              <p className="text-muted small">Incluye SKU, instrucciones, formatos, referencias válidas y un ejemplo separado.</p>
              <button type="button" className="btn btn-outline-primary" onClick={() => void descargarPlantilla()} disabled={descargando}>
                <i className="ti ti-file-spreadsheet me-1" />{descargando ? 'Preparando…' : 'Descargar plantilla'}
              </button>
            </div>
          </div></div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100"><div className="card-body p-4 d-flex gap-3 align-items-start">
            <span className="badge rounded-circle bg-light-success text-success p-3 fs-5">2</span>
            <div className="flex-grow-1">
              <h5 className="fw-bold">Analizar Excel o CSV</h5>
              <p className="text-muted small">Este paso no modifica datos. Los cambios se aplican recién al confirmar.</p>
              <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={analizando || confirmando}>
                {analizando ? <><span className="spinner-border spinner-border-sm me-2" />Analizando…</> : <><i className="ti ti-upload me-1" />Seleccionar archivo</>}
              </button>
              <input ref={inputRef} aria-label="Archivo de productos" type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="d-none" onChange={(event) => void analizarArchivo(event)} />
              {archivo && <small className="d-block text-muted mt-2"><i className="ti ti-paperclip me-1" />{archivo.name}</small>}
            </div>
          </div></div>
        </div>
      </div>

      {previsualizacion && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <h5 className="fw-bold mb-1">Previsualización</h5>
                <p className="text-muted small mb-0">Revisá la clasificación. Las filas con error se omitirán y quedarán registradas.</p>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => inputRef.current?.click()} disabled={confirmando}>Elegir otro archivo</button>
                <button type="button" className="btn btn-success" onClick={() => void confirmarImportacion()} disabled={confirmando}>
                  {confirmando ? <><span className="spinner-border spinner-border-sm me-2" />Confirmando…</> : <><i className="ti ti-check me-1" />Confirmar importación</>}
                </button>
              </div>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-6 col-xl-3"><div className="border rounded-3 p-3"><small className="text-muted">Productos nuevos</small><strong className="d-block fs-3 text-success">{previsualizacion.resumen.nuevos}</strong></div></div>
              <div className="col-6 col-xl-3"><div className="border rounded-3 p-3"><small className="text-muted">Se actualizarán</small><strong className="d-block fs-3 text-primary">{previsualizacion.resumen.actualizar}</strong></div></div>
              <div className="col-6 col-xl-3"><div className="border rounded-3 p-3"><small className="text-muted">Sin cambios</small><strong className="d-block fs-3 text-secondary">{previsualizacion.resumen.sinCambios}</strong></div></div>
              <div className="col-6 col-xl-3"><div className="border rounded-3 p-3"><small className="text-muted">Con errores</small><strong className="d-block fs-3 text-danger">{previsualizacion.resumen.errores}</strong></div></div>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3" aria-label="Filtrar resultados">
              {ESTADOS.map((opcion) => (
                <button key={opcion.estado} type="button" className={`btn btn-sm ${filtro === opcion.estado ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFiltro(opcion.estado)}>
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
            <div className="table-responsive border rounded-3">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Fila</th><th>SKU</th><th>Producto</th><th>Estado</th><th>Detalle</th></tr></thead>
                <tbody>
                  {filasVisibles.map((fila) => (
                    <tr key={`${fila.fila}-${fila.sku}`}>
                      <td>{fila.fila}</td><td><code>{fila.sku}</code></td><td><strong>{fila.producto}</strong></td>
                      <td><span className={`badge ${claseEstado(fila.estado)}`}>{fila.estado.replace('_', ' ')}</span></td>
                      <td>
                        {fila.errores.length > 0 && <ul className="small text-danger mb-0 ps-3">{fila.errores.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul>}
                        {fila.cambios.length > 0 && <ul className="small mb-0 ps-3">{fila.cambios.map((cambio) => <li key={cambio.campo}><strong>{ETIQUETAS_CAMPOS[cambio.campo] ?? cambio.campo}:</strong> {String(cambio.actual ?? '—')} → {String(cambio.nuevo ?? '—')}</li>)}</ul>}
                        {!fila.errores.length && !fila.cambios.length && <span className="small text-muted">{fila.estado === 'NUEVO' ? 'Se creará al confirmar.' : 'No requiere acciones.'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previsualizacion.resumen.errores > 0 && (
              <div className="alert alert-warning mt-3 mb-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>Podés corregir el archivo y volver a analizarlo, o confirmar para procesar las filas válidas.</span>
                <div className="d-flex flex-wrap gap-2">
                  <Link target="_blank" rel="noreferrer" to="/productos/catalogos" className="btn btn-sm btn-outline-secondary">Crear categoría o marca</Link>
                  <Link target="_blank" rel="noreferrer" to="/productos/ubicaciones" className="btn btn-sm btn-outline-secondary">Crear ubicación</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {resultado && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="d-flex align-items-start gap-3 mb-4"><i className="ti ti-circle-check text-success fs-1" /><div><h5 className="fw-bold mb-1">Importación completada</h5><p className="text-muted mb-0">Los productos válidos fueron procesados y el resultado quedó registrado.</p></div></div>
            <div className="row g-3">
              <div className="col-6 col-lg-3"><div className="border rounded p-3"><small>Creados</small><strong className="d-block fs-4 text-success">{resultado.creados}</strong></div></div>
              <div className="col-6 col-lg-3"><div className="border rounded p-3"><small>Actualizados</small><strong className="d-block fs-4 text-primary">{resultado.actualizados}</strong></div></div>
              <div className="col-6 col-lg-3"><div className="border rounded p-3"><small>Sin cambios</small><strong className="d-block fs-4">{resultado.sinCambios}</strong></div></div>
              <div className="col-6 col-lg-3"><div className="border rounded p-3"><small>Errores</small><strong className="d-block fs-4 text-danger">{resultado.errores}</strong></div></div>
            </div>
            {resultado.detalleErrores.length > 0 && <div className="table-responsive mt-4"><table className="table table-sm"><thead><tr><th>Fila</th><th>SKU</th><th>Producto</th><th>Motivo</th></tr></thead><tbody>{resultado.detalleErrores.map((item) => <tr key={`${item.fila}-${item.sku}`}><td>{item.fila}</td><td>{item.sku}</td><td>{item.producto}</td><td className="text-danger">{item.errores.join(' ')}</td></tr>)}</tbody></table></div>}
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header p-4"><h5 className="fw-bold mb-1">Historial de importaciones</h5><p className="text-muted small mb-0">Últimas 50 confirmaciones realizadas.</p></div>
        <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr><th>Fecha</th><th>Archivo</th><th>Usuario</th><th>Procesados</th><th>Creados</th><th>Actualizados</th><th>Sin cambios</th><th>Errores</th></tr></thead><tbody>
          {historial.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">Todavía no hay importaciones confirmadas.</td></tr>}
          {historial.map((item) => <tr key={item.idImportacion}><td>{new Date(item.fechaHora).toLocaleString('es-AR')}</td><td>{item.nombreArchivo}</td><td>{item.usuarioNombre}</td><td>{item.totalProcesados}</td><td className="text-success">{item.creados}</td><td className="text-primary">{item.actualizados}</td><td>{item.sinCambios}</td><td className={item.errores ? 'text-danger' : ''}>{item.errores}</td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}
