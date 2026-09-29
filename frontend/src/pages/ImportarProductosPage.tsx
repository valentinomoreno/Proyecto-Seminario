import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type {
  ErrorImportacionProducto,
  FilaImportacionProducto,
  ResultadoImportacionProductos,
} from '../types/producto.types';

const COLUMNAS: Array<{ key: keyof FilaImportacionProducto; label: string; type?: 'number' }> = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'precio_costo', label: 'Precio de costo', type: 'number' },
  { key: 'precio_venta', label: 'Precio de venta', type: 'number' },
  { key: 'stock_inicial', label: 'Stock inicial', type: 'number' },
  { key: 'stock_minimo', label: 'Stock mínimo', type: 'number' },
  { key: 'punto_pedido', label: 'Punto de pedido', type: 'number' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'marca', label: 'Marca' },
  { key: 'deposito', label: 'Depósito' },
  { key: 'sector', label: 'Sector' },
  { key: 'estante', label: 'Estante' },
];

const FILA_VACIA = Object.fromEntries(COLUMNAS.map(({ key }) => [key, ''])) as unknown as FilaImportacionProducto;

function normalizarFila(datos: Partial<FilaImportacionProducto>): FilaImportacionProducto {
  return { ...FILA_VACIA, ...datos };
}

function escaparCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function archivoCorreccion(fila: FilaImportacionProducto, numeroFila: number): File {
  const encabezados = COLUMNAS.map(({ key }) => key).join(',');
  const valores = COLUMNAS.map(({ key }) => escaparCsv(fila[key])).join(',');
  return new File([`${encabezados}\n${valores}`], `correccion-fila-${numeroFila}.csv`, { type: 'text/csv' });
}

export function ImportarProductosPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [resultado, setResultado] = useState<ResultadoImportacionProductos | null>(null);
  const [importando, setImportando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState<ErrorImportacionProducto | null>(null);
  const [correccion, setCorreccion] = useState<FilaImportacionProducto>(FILA_VACIA);
  const [reintentando, setReintentando] = useState(false);
  const [resueltas, setResueltas] = useState<Set<number>>(new Set());
  const [omitidas, setOmitidas] = useState<Set<number>>(new Set());

  const pendientes = useMemo(
    () => resultado?.errores.filter((item) => !resueltas.has(item.fila) && !omitidas.has(item.fila)) ?? [],
    [resultado, resueltas, omitidas],
  );

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

  async function enviarArchivo(archivo: File): Promise<ResultadoImportacionProductos> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const { data } = await api.post<ResultadoImportacionProductos>('/productos/importar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async function importarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setImportando(true);
    setError('');
    setResultado(null);
    setResueltas(new Set());
    setOmitidas(new Set());
    setArchivoNombre(archivo.name);
    try {
      setResultado(await enviarArchivo(archivo));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setImportando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function resolver(item: ErrorImportacionProducto) {
    setSeleccionada(item);
    setCorreccion(normalizarFila(item.datos));
  }

  async function reintentar() {
    if (!seleccionada) return;
    setReintentando(true);
    setError('');
    try {
      const respuesta = await enviarArchivo(archivoCorreccion(correccion, seleccionada.fila));
      if (respuesta.importados === 1) {
        setResueltas((actuales) => new Set(actuales).add(seleccionada.fila));
        setSeleccionada(null);
      } else if (respuesta.errores[0]) {
        const actualizada = { ...respuesta.errores[0], fila: seleccionada.fila };
        setResultado((actual) => actual ? {
          ...actual,
          errores: actual.errores.map((item) => item.fila === seleccionada.fila ? actualizada : item),
        } : actual);
        setSeleccionada(actualizada);
        setCorreccion(normalizarFila(actualizada.datos));
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setReintentando(false);
    }
  }

  function omitirFila(fila: number) {
    setOmitidas((actuales) => new Set(actuales).add(fila));
    setSeleccionada(null);
  }

  return (
    <div className="importar-productos-page">
      <div className="page-header mb-4">
        <div className="page-block d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="mb-1 fw-bold">Importar Productos</h4>
            <p className="text-muted mb-0">Carga masiva controlada con plantilla estándar y resolución de errores por fila.</p>
          </div>
          <Link to="/catalogo" className="btn btn-outline-secondary"><i className="ti ti-arrow-left me-1" />Volver al catálogo</Link>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 d-flex gap-3 align-items-start">
              <span className="badge rounded-circle bg-light-primary text-primary p-3 fs-5">1</span>
              <div className="flex-grow-1">
                <h5 className="fw-bold">Descargar el archivo estándar</h5>
                <p className="text-muted small">Incluye instrucciones, encabezados inalterables, formatos, listas de referencia y un ejemplo separado.</p>
                <button type="button" className="btn btn-outline-primary" onClick={() => void descargarPlantilla()} disabled={descargando}>
                  <i className="ti ti-file-spreadsheet me-1" />{descargando ? 'Preparando…' : 'Descargar plantilla estándar'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 d-flex gap-3 align-items-start">
              <span className="badge rounded-circle bg-light-success text-success p-3 fs-5">2</span>
              <div className="flex-grow-1">
                <h5 className="fw-bold">Seleccionar el archivo completo</h5>
                <p className="text-muted small">El sistema filtra las filas: carga las correctas y separa las que necesitan una decisión.</p>
                <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={importando}>
                  {importando ? <><span className="spinner-border spinner-border-sm me-2" />Analizando…</> : <><i className="ti ti-upload me-1" />Seleccionar Excel o CSV</>}
                </button>
                <input
                  ref={inputRef}
                  aria-label="Archivo de productos"
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="d-none"
                  onChange={(event) => void importarArchivo(event)}
                />
                {archivoNombre && <small className="d-block text-muted mt-2"><i className="ti ti-paperclip me-1" />{archivoNombre}</small>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {resultado && (
        <div className="card border-0 shadow-sm">
          <div className="card-header p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <h5 className="fw-bold mb-1">Resultado de la importación</h5>
                <p className="text-muted small mb-0">Las filas válidas ya quedaron cargadas. Resolvé únicamente las pendientes.</p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-light-secondary text-secondary px-3 py-2">{resultado.totalFilas} analizadas</span>
                <span className="badge bg-light-success text-success px-3 py-2">{resultado.importados} cargadas</span>
                <span className="badge bg-light-primary text-primary px-3 py-2">{resueltas.size} corregidas</span>
                <span className="badge bg-light-warning text-warning px-3 py-2">{pendientes.length} pendientes</span>
                <span className="badge bg-light-secondary text-secondary px-3 py-2">{omitidas.size} omitidas</span>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {pendientes.length === 0 ? (
              <div className="text-center py-5 px-3">
                <i className="ti ti-circle-check text-success fs-1 d-block mb-2" />
                <strong>No quedan filas pendientes.</strong>
                <p className="text-muted mb-3">La importación fue revisada por completo.</p>
                <Link to="/catalogo" className="btn btn-primary">Ver productos cargados</Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Fila</th><th>Producto</th><th>Qué está mal</th><th className="text-end">Decidir</th></tr></thead>
                  <tbody>
                    {pendientes.map((item) => (
                      <tr key={item.fila}>
                        <td><span className="badge bg-light-secondary text-secondary">{item.fila}</span></td>
                        <td><strong>{item.producto}</strong></td>
                        <td><ul className="mb-0 ps-3 small text-danger">{item.errores.map((detalle) => <li key={detalle}>{detalle}</li>)}</ul></td>
                        <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => resolver(item)}><i className="ti ti-tool me-1" />Resolver</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {seleccionada && (
        <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="resolver-importacion-title" style={{ background: 'rgba(15, 23, 42, 0.65)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold" id="resolver-importacion-title">Resolver fila {seleccionada.fila}</h5>
                  <p className="small text-muted mb-0">Corregí los datos y reintentá, creá las referencias faltantes o decidí omitir la fila.</p>
                </div>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setSeleccionada(null)} />
              </div>
              <div className="modal-body">
                <div className="alert alert-warning py-2">
                  <strong>Problemas detectados:</strong>
                  <ul className="mb-0 mt-1">{seleccionada.errores.map((detalle) => <li key={detalle}>{detalle}</li>)}</ul>
                </div>
                <div className="row g-3">
                  {COLUMNAS.map(({ key, label, type }) => (
                    <div className={key === 'descripcion' ? 'col-12' : 'col-md-6 col-xl-4'} key={key}>
                      <label className="form-label fw-semibold" htmlFor={`correccion-${key}`}>{label}</label>
                      <input
                        id={`correccion-${key}`}
                        className="form-control"
                        type={type === 'number' ? 'number' : 'text'}
                        min={type === 'number' ? 0 : undefined}
                        step={key.startsWith('precio_') ? '0.01' : type === 'number' ? '1' : undefined}
                        value={correccion[key]}
                        onChange={(event) => setCorreccion((actual) => ({ ...actual, [key]: event.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="border rounded-3 bg-light p-3 mt-4">
                  <strong className="d-block mb-2">¿Falta crear una referencia?</strong>
                  <div className="d-flex flex-wrap gap-2">
                    <Link target="_blank" rel="noreferrer" to="/productos/catalogos" className="btn btn-sm btn-outline-secondary"><i className="ti ti-tags me-1" />Crear categoría o marca</Link>
                    <Link target="_blank" rel="noreferrer" to="/productos/ubicaciones" className="btn btn-sm btn-outline-secondary"><i className="ti ti-building-warehouse me-1" />Crear depósito, sector o estante</Link>
                  </div>
                  <small className="text-muted d-block mt-2">Las pantallas se abren aparte. Después regresá, completá el nombre exactamente y reintentá esta fila.</small>
                </div>
              </div>
              <div className="modal-footer d-flex flex-wrap justify-content-between gap-2">
                <button type="button" className="btn btn-outline-danger" onClick={() => omitirFila(seleccionada.fila)}>Omitir esta fila</button>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSeleccionada(null)}>Decidir después</button>
                  <button type="button" className="btn btn-primary" disabled={reintentando} onClick={() => void reintentar()}>{reintentando ? 'Validando…' : 'Corregir y reintentar'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
