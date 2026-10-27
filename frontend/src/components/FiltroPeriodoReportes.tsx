import type { Periodo } from '../api/reportes.service';

export function FiltroPeriodoReportes({ periodo, onChange, onBuscar, cargando }: {
  periodo: Periodo;
  onChange: (periodo: Periodo) => void;
  onBuscar: () => void;
  cargando: boolean;
}) {
  return (
    <div className="d-flex flex-wrap align-items-end gap-2 mb-4">
      <label className="form-label mb-0">Desde
        <input className="form-control" type="date" value={periodo.desde} onChange={(e) => onChange({ ...periodo, desde: e.target.value })} />
      </label>
      <label className="form-label mb-0">Hasta
        <input className="form-control" type="date" value={periodo.hasta} onChange={(e) => onChange({ ...periodo, hasta: e.target.value })} />
      </label>
      <button type="button" className="btn btn-primary" disabled={cargando || !periodo.desde || !periodo.hasta || periodo.desde > periodo.hasta} onClick={onBuscar}>
        {cargando ? 'Consultando…' : 'Consultar'}
      </button>
    </div>
  );
}
