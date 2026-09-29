import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { Deposito, Estante, Sector } from '../types/producto.types';

type Guardando = 'deposito' | 'sector' | 'estante' | null;

const depositoInicial = { id: null as number | null, nombre: '', direccion: '' };
const sectorInicial = { id: null as number | null, nombre: '', depositoId: '' };
const estanteInicial = {
  id: null as number | null,
  codigo: '',
  descripcion: '',
  depositoId: '',
  sectorId: '',
};

export function UbicacionesPage() {
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [estantes, setEstantes] = useState<Estante[]>([]);
  const [depositoForm, setDepositoForm] = useState(depositoInicial);
  const [sectorForm, setSectorForm] = useState(sectorInicial);
  const [estanteForm, setEstanteForm] = useState(estanteInicial);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<Guardando>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarUbicaciones = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [depositosResponse, sectoresResponse, estantesResponse] = await Promise.all([
        api.get<Deposito[]>('/depositos'),
        api.get<Sector[]>('/sectores'),
        api.get<Estante[]>('/estantes'),
      ]);
      setDepositos(depositosResponse.data);
      setSectores(sectoresResponse.data);
      setEstantes(estantesResponse.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarUbicaciones();
  }, [cargarUbicaciones]);

  const sectoresDelDeposito = useMemo(
    () => sectores.filter((sector) => sector.deposito.idDeposito === Number(estanteForm.depositoId)),
    [estanteForm.depositoId, sectores],
  );

  const guardarDeposito = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando('deposito');
    setError('');
    setMensaje('');
    const payload = {
      nombre: depositoForm.nombre.trim(),
      direccion: depositoForm.direccion.trim(),
    };
    try {
      if (depositoForm.id === null) {
        await api.post('/depositos', payload);
      } else {
        await api.put(`/depositos/${depositoForm.id}`, payload);
      }
      setMensaje(`Depósito ${depositoForm.id === null ? 'creado' : 'actualizado'} correctamente.`);
      setDepositoForm(depositoInicial);
      await cargarUbicaciones();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(null);
    }
  };

  const guardarSector = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando('sector');
    setError('');
    setMensaje('');
    const payload = {
      nombre: sectorForm.nombre.trim(),
      depositoId: Number(sectorForm.depositoId),
    };
    try {
      if (sectorForm.id === null) {
        await api.post('/sectores', payload);
      } else {
        await api.put(`/sectores/${sectorForm.id}`, payload);
      }
      setMensaje(`Sector ${sectorForm.id === null ? 'creado' : 'actualizado'} correctamente.`);
      setSectorForm(sectorInicial);
      await cargarUbicaciones();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(null);
    }
  };

  const guardarEstante = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando('estante');
    setError('');
    setMensaje('');
    const payload = {
      codigo: estanteForm.codigo.trim(),
      descripcion: estanteForm.descripcion.trim(),
      sectorId: Number(estanteForm.sectorId),
    };
    try {
      if (estanteForm.id === null) {
        await api.post('/estantes', payload);
      } else {
        await api.put(`/estantes/${estanteForm.id}`, payload);
      }
      setMensaje(`Estante ${estanteForm.id === null ? 'creado' : 'actualizado'} correctamente.`);
      setEstanteForm(estanteInicial);
      await cargarUbicaciones();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="ubicaciones-page">
      <div className="page-header mb-4">
        <div className="page-block">
          <h4 className="mb-1 fw-bold">Depósitos, Sectores y Estantes</h4>
          <p className="text-muted mb-0">
            Organizá el inventario en tantos depósitos como necesites y definí la ubicación exacta de cada repuesto.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

      <div className="row g-4 mb-4">
        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header py-3">
              <h5 className="mb-0"><i className="ti ti-building-warehouse me-2 text-primary" />{depositoForm.id === null ? 'Nuevo depósito' : 'Modificar depósito'}</h5>
            </div>
            <form className="card-body d-flex flex-column" onSubmit={guardarDeposito}>
              <label className="form-label fw-semibold" htmlFor="deposito-nombre">Nombre *</label>
              <input
                id="deposito-nombre"
                className="form-control mb-3"
                maxLength={80}
                value={depositoForm.nombre}
                onChange={(event) => setDepositoForm((actual) => ({ ...actual, nombre: event.target.value }))}
                placeholder="Ej.: Depósito Norte"
                required
              />
              <label className="form-label fw-semibold" htmlFor="deposito-direccion">Dirección</label>
              <input
                id="deposito-direccion"
                className="form-control mb-3"
                maxLength={180}
                value={depositoForm.direccion}
                onChange={(event) => setDepositoForm((actual) => ({ ...actual, direccion: event.target.value }))}
                placeholder="Ej.: Av. Colón 1250"
              />
              <div className="d-flex flex-wrap gap-2 mt-auto">
                <button className="btn btn-primary" disabled={guardando !== null || !depositoForm.nombre.trim()}>
                  {guardando === 'deposito' ? 'Guardando…' : depositoForm.id === null ? 'Crear depósito' : 'Guardar cambios'}
                </button>
                {depositoForm.id !== null && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setDepositoForm(depositoInicial)}>Cancelar</button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header py-3">
              <h5 className="mb-0"><i className="ti ti-layout-grid me-2 text-primary" />{sectorForm.id === null ? 'Nuevo sector' : 'Modificar sector'}</h5>
            </div>
            <form className="card-body d-flex flex-column" onSubmit={guardarSector}>
              <label className="form-label fw-semibold" htmlFor="sector-deposito">Depósito *</label>
              <select
                id="sector-deposito"
                className="form-select mb-3"
                value={sectorForm.depositoId}
                onChange={(event) => setSectorForm((actual) => ({ ...actual, depositoId: event.target.value }))}
                required
              >
                <option value="">Seleccionar depósito</option>
                {depositos.map((deposito) => <option key={deposito.idDeposito} value={deposito.idDeposito}>{deposito.nombre}</option>)}
              </select>
              <label className="form-label fw-semibold" htmlFor="sector-nombre">Nombre *</label>
              <input
                id="sector-nombre"
                className="form-control mb-3"
                maxLength={60}
                value={sectorForm.nombre}
                onChange={(event) => setSectorForm((actual) => ({ ...actual, nombre: event.target.value }))}
                placeholder="Ej.: Tren delantero"
                required
              />
              <div className="d-flex flex-wrap gap-2 mt-auto">
                <button className="btn btn-primary" disabled={guardando !== null || !sectorForm.nombre.trim() || !sectorForm.depositoId}>
                  {guardando === 'sector' ? 'Guardando…' : sectorForm.id === null ? 'Crear sector' : 'Guardar cambios'}
                </button>
                {sectorForm.id !== null && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSectorForm(sectorInicial)}>Cancelar</button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header py-3">
              <h5 className="mb-0"><i className="ti ti-books me-2 text-primary" />{estanteForm.id === null ? 'Nuevo estante' : 'Modificar estante'}</h5>
            </div>
            <form className="card-body d-flex flex-column" onSubmit={guardarEstante}>
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label fw-semibold" htmlFor="estante-deposito">Depósito *</label>
                  <select
                    id="estante-deposito"
                    className="form-select"
                    value={estanteForm.depositoId}
                    onChange={(event) => setEstanteForm((actual) => ({ ...actual, depositoId: event.target.value, sectorId: '' }))}
                    required
                  >
                    <option value="">Seleccionar</option>
                    {depositos.map((deposito) => <option key={deposito.idDeposito} value={deposito.idDeposito}>{deposito.nombre}</option>)}
                  </select>
                </div>
                <div className="col-sm-6">
                  <label className="form-label fw-semibold" htmlFor="estante-sector">Sector *</label>
                  <select
                    id="estante-sector"
                    className="form-select"
                    value={estanteForm.sectorId}
                    onChange={(event) => setEstanteForm((actual) => ({ ...actual, sectorId: event.target.value }))}
                    disabled={!estanteForm.depositoId}
                    required
                  >
                    <option value="">Seleccionar</option>
                    {sectoresDelDeposito.map((sector) => <option key={sector.idSector} value={sector.idSector}>{sector.nombre}</option>)}
                  </select>
                </div>
              </div>
              <label className="form-label fw-semibold" htmlFor="estante-codigo">Código *</label>
              <input
                id="estante-codigo"
                className="form-control mb-3"
                maxLength={40}
                value={estanteForm.codigo}
                onChange={(event) => setEstanteForm((actual) => ({ ...actual, codigo: event.target.value }))}
                placeholder="Ej.: B-04"
                required
              />
              <label className="form-label fw-semibold" htmlFor="estante-descripcion">Descripción</label>
              <input
                id="estante-descripcion"
                className="form-control mb-3"
                maxLength={160}
                value={estanteForm.descripcion}
                onChange={(event) => setEstanteForm((actual) => ({ ...actual, descripcion: event.target.value }))}
                placeholder="Ej.: Nivel superior"
              />
              <div className="d-flex flex-wrap gap-2 mt-auto">
                <button className="btn btn-primary" disabled={guardando !== null || !estanteForm.codigo.trim() || !estanteForm.sectorId}>
                  {guardando === 'estante' ? 'Guardando…' : estanteForm.id === null ? 'Crear estante' : 'Guardar cambios'}
                </button>
                {estanteForm.id !== null && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEstanteForm(estanteInicial)}>Cancelar</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-4">
          <UbicacionesTabla titulo="Depósitos" cantidad={depositos.length} columnas={['Nombre', 'Dirección', '']} cargando={cargando}>
            {depositos.map((deposito) => (
              <tr key={deposito.idDeposito}>
                <td><strong>{deposito.nombre}</strong></td>
                <td className="text-muted">{deposito.direccion || 'Sin dirección'}</td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    aria-label={`Editar depósito ${deposito.nombre}`}
                    onClick={() => setDepositoForm({ id: deposito.idDeposito, nombre: deposito.nombre, direccion: deposito.direccion || '' })}
                  ><i className="ti ti-edit" /></button>
                </td>
              </tr>
            ))}
          </UbicacionesTabla>
        </div>

        <div className="col-xl-4">
          <UbicacionesTabla titulo="Sectores" cantidad={sectores.length} columnas={['Nombre', 'Depósito', '']} cargando={cargando}>
            {sectores.map((sector) => (
              <tr key={sector.idSector}>
                <td><strong>{sector.nombre}</strong></td>
                <td>{sector.deposito.nombre}</td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    aria-label={`Editar sector ${sector.nombre}`}
                    onClick={() => setSectorForm({ id: sector.idSector, nombre: sector.nombre, depositoId: String(sector.deposito.idDeposito) })}
                  ><i className="ti ti-edit" /></button>
                </td>
              </tr>
            ))}
          </UbicacionesTabla>
        </div>

        <div className="col-xl-4">
          <UbicacionesTabla titulo="Estantes" cantidad={estantes.length} columnas={['Código', 'Ubicación', '']} cargando={cargando}>
            {estantes.map((estante) => (
              <tr key={estante.idEstante}>
                <td><strong className="font-monospace">{estante.codigo}</strong><small className="d-block text-muted">{estante.descripcion || 'Sin descripción'}</small></td>
                <td>{estante.sector.deposito.nombre}<small className="d-block text-muted">{estante.sector.nombre}</small></td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    aria-label={`Editar estante ${estante.codigo}`}
                    onClick={() => setEstanteForm({
                      id: estante.idEstante,
                      codigo: estante.codigo,
                      descripcion: estante.descripcion || '',
                      depositoId: String(estante.sector.deposito.idDeposito),
                      sectorId: String(estante.sector.idSector),
                    })}
                  ><i className="ti ti-edit" /></button>
                </td>
              </tr>
            ))}
          </UbicacionesTabla>
        </div>
      </div>
    </div>
  );
}

interface UbicacionesTablaProps {
  titulo: string;
  cantidad: number;
  columnas: string[];
  cargando: boolean;
  children: ReactNode;
}

function UbicacionesTabla({ titulo, cantidad, columnas, cargando, children }: UbicacionesTablaProps) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{titulo}</h5>
        <span className="badge bg-light-primary text-primary">{cantidad}</span>
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light"><tr>{columnas.map((columna, index) => <th key={`${columna}-${index}`}>{columna}</th>)}</tr></thead>
          <tbody>
            {cargando
              ? <tr><td colSpan={columnas.length} className="text-center py-4 text-muted">Cargando…</td></tr>
              : children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
