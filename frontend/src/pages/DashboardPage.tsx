import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { DashboardData, EstadoCuentaDashboard } from '../types/dashboard.types';

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const METODOS = {
  EFECTIVO: { label: 'Efectivo', color: '#16a085' },
  MERCADO_PAGO: { label: 'Mercado Pago', color: '#1677ff' },
  CUENTA_CORRIENTE: { label: 'Cuenta corriente', color: '#f5a623' },
  OTROS: { label: 'Otros medios', color: '#8b95a5' },
} as const;

const ESTADOS = {
  AL_DIA: { label: 'Al día', color: 'success', dot: '🟢' },
  EN_COBRO: { label: 'En período de cobro', color: 'warning', dot: '🟡' },
  EN_MORA: { label: 'En mora', color: 'danger', dot: '🔴' },
} as const;

function GraficoVentas({ datos }: { datos: DashboardData['ventas'] }) {
  const [diaActivo, setDiaActivo] = useState<number | null>(null);
  const width = 760;
  const height = 250;
  const padding = 34;
  const maximo = Math.max(1, ...datos.puntos.flatMap((punto) => [punto.actual, punto.anterior]));
  const x = (indice: number) => padding + (indice / Math.max(1, datos.puntos.length - 1)) * (width - padding * 2);
  const y = (valor: number) => height - padding - (valor / maximo) * (height - padding * 2);
  const puntosActual = datos.puntos.map((punto, index) => `${x(index)},${y(punto.actual)}`).join(' ');
  const puntosAnterior = datos.puntos.map((punto, index) => `${x(index)},${y(punto.anterior)}`).join(' ');
  const activo = diaActivo === null ? null : datos.puntos.find((punto) => punto.dia === diaActivo);

  return (
    <div className="dashboard-chart-wrap">
      {activo && (
        <div className="dashboard-chart-tooltip">
          <strong>Día {activo.dia}</strong>
          <span>{datos.mesActual}: {moneda.format(activo.actual)} ({activo.operacionesActual} ventas)</span>
          <span>{datos.mesAnterior}: {moneda.format(activo.anterior)} ({activo.operacionesAnterior} ventas)</span>
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Comparación diaria de ventas" className="dashboard-line-chart">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={padding} x2={width - padding} y1={y(maximo * ratio)} y2={y(maximo * ratio)} className="chart-grid-line" />
        ))}
        <polyline points={puntosAnterior} fill="none" stroke="#9aa5b5" strokeWidth="3" strokeDasharray="7 5" />
        <polyline points={puntosActual} fill="none" stroke="#1677ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {datos.puntos.map((punto, index) => (
          <g key={punto.dia} onMouseEnter={() => setDiaActivo(punto.dia)} onMouseLeave={() => setDiaActivo(null)}>
            <circle cx={x(index)} cy={y(punto.actual)} r="9" fill="transparent" />
            <circle cx={x(index)} cy={y(punto.actual)} r={diaActivo === punto.dia ? 5 : 3} fill="#1677ff" />
          </g>
        ))}
        {datos.puntos.filter((punto) => punto.dia === 1 || punto.dia % 5 === 0).map((punto) => (
          <text key={punto.dia} x={x(datos.puntos.indexOf(punto))} y={height - 8} textAnchor="middle" className="chart-axis-text">{punto.dia}</text>
        ))}
      </svg>
      <div className="d-flex flex-wrap gap-3 justify-content-center small mt-2">
        <span><i className="dashboard-legend-line current" /> {datos.mesActual}</span>
        <span><i className="dashboard-legend-line previous" /> {datos.mesAnterior}</span>
      </div>
    </div>
  );
}

function DonaPagos({ metodos }: { metodos: DashboardData['metodosPago'] }) {
  const [seleccionado, setSeleccionado] = useState<DashboardData['metodosPago'][number]['metodo'] | null>(null);
  const total = metodos.reduce((suma, item) => suma + item.total, 0);
  let acumulado = 0;
  const segmentos = metodos.map((item) => {
    const inicio = total ? (acumulado / total) * 360 : 0;
    acumulado += item.total;
    const fin = total ? (acumulado / total) * 360 : 0;
    return `${METODOS[item.metodo].color} ${inicio}deg ${fin}deg`;
  });
  const activo = metodos.find((item) => item.metodo === seleccionado);

  return (
    <div className="row align-items-center g-4">
      <div className="col-sm-5 text-center">
        <div
          className="dashboard-donut mx-auto"
          style={{ background: total ? `conic-gradient(${segmentos.join(',')})` : '#e9edf3' }}
          aria-label="Distribución de métodos de pago"
        >
          <div className="dashboard-donut-center">
            <strong>{activo ? `${total ? Math.round((activo.total / total) * 100) : 0}%` : moneda.format(total)}</strong>
            <span>{activo ? METODOS[activo.metodo].label : 'Total del mes'}</span>
          </div>
        </div>
      </div>
      <div className="col-sm-7">
        <div className="d-grid gap-2">
          {metodos.map((item) => (
            <button
              type="button"
              key={item.metodo}
              className={`dashboard-payment-row ${seleccionado === item.metodo ? 'active' : ''}`}
              onClick={() => setSeleccionado(seleccionado === item.metodo ? null : item.metodo)}
            >
              <span className="dashboard-color-dot" style={{ backgroundColor: METODOS[item.metodo].color }} />
              <span className="text-start flex-grow-1"><strong>{METODOS[item.metodo].label}</strong><small>{item.cantidad} operaciones</small></span>
              <strong>{total ? Math.round((item.total / total) * 100) : 0}%</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoCuentaDashboard | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso) setActualizando(true); else setCargando(true);
    try {
      const response = await api.get<DashboardData>('/dashboard');
      setData(response.data);
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    const timer = window.setInterval(() => void cargar(true), 30_000);
    return () => window.clearInterval(timer);
  }, [cargar]);

  const variacion = data && data.ventas.totalAnterior > 0
    ? ((data.ventas.totalActual - data.ventas.totalAnterior) / data.ventas.totalAnterior) * 100
    : null;
  const cuentasFiltradas = useMemo(() => data?.cuentas.clientes.filter((cuenta) =>
    filtroEstado ? cuenta.estado === filtroEstado : cuenta.saldo > 0,
  ) ?? [], [data, filtroEstado]);

  if (cargando && !data) return <div className="card border-0 shadow-sm p-5 text-center text-muted"><span className="spinner-border spinner-border-sm mx-auto mb-2" />Cargando métricas…</div>;

  return (
    <div className="dashboard-page">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div><h4 className="fw-bold mb-1">Dashboard de Administración</h4><p className="text-muted mb-0">Métricas operativas actualizadas cada 30 segundos.</p></div>
        <button type="button" className="btn btn-outline-primary" onClick={() => void cargar(true)} disabled={actualizando}>
          <i className={`ti ti-refresh me-1 ${actualizando ? 'dashboard-spin' : ''}`} /> Actualizar ahora
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3"><div className="dashboard-kpi-card primary"><span>Ventas del mes</span><strong>{moneda.format(data.ventas.totalActual)}</strong><small>{data.ventas.operacionesActual} operaciones</small></div></div>
            <div className="col-sm-6 col-xl-3"><div className="dashboard-kpi-card neutral"><span>Variación mensual</span><strong>{variacion === null ? 'Sin base' : `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`}</strong><small>contra {data.ventas.mesAnterior}</small></div></div>
            <div className="col-sm-6 col-xl-3"><div className="dashboard-kpi-card danger"><span>Cuentas en mora</span><strong>{data.cuentas.resumen.enMora}</strong><small>desde el día {data.cuentas.diaInicioMora}</small></div></div>
            <div className="col-sm-6 col-xl-3"><Link to="/stock/alertas" className="dashboard-kpi-card warning text-decoration-none"><span>Alertas de stock</span><strong>{data.inventario.alertasStock}</strong><small>ver sugerido de compra →</small></Link></div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-xl-8"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white border-0 pt-4 px-4"><h5 className="fw-bold mb-1">Volumen de ventas</h5><p className="small text-muted mb-0">Monto facturado por día, mes actual vs. anterior.</p></div><div className="card-body"><GraficoVentas datos={data.ventas} /></div></div></div>
            <div className="col-xl-4"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-white border-0 pt-4 px-4"><h5 className="fw-bold mb-1">Métodos de pago</h5><p className="small text-muted mb-0">Distribución sobre el monto del mes.</p></div><div className="card-body"><DonaPagos metodos={data.metodosPago} /></div></div></div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white p-4 border-bottom"><h5 className="fw-bold mb-1">Semáforo de cuentas corrientes</h5><p className="small text-muted mb-0">Seleccione un estado para filtrar el detalle de clientes.</p></div>
            <div className="card-body p-4">
              <div className="row g-3 mb-4">
                {(['AL_DIA', 'EN_COBRO', 'EN_MORA'] as EstadoCuentaDashboard[]).map((estado) => {
                  const cantidad = estado === 'AL_DIA' ? data.cuentas.resumen.alDia : estado === 'EN_COBRO' ? data.cuentas.resumen.enCobro : data.cuentas.resumen.enMora;
                  return <div className="col-md-4" key={estado}><button type="button" className={`dashboard-status-card ${ESTADOS[estado].color} ${filtroEstado === estado ? 'active' : ''}`} onClick={() => setFiltroEstado(filtroEstado === estado ? null : estado)}><span className="fs-3">{ESTADOS[estado].dot}</span><span><strong>{cantidad}</strong><small>{ESTADOS[estado].label}</small></span></button></div>;
                })}
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr><th>Cuenta</th><th>Cliente</th><th>Estado</th><th className="text-end">Saldo pendiente</th></tr></thead>
                  <tbody>
                    {cuentasFiltradas.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No hay cuentas en este estado.</td></tr>}
                    {cuentasFiltradas.slice(0, 12).map((cuenta) => <tr key={cuenta.idCuentaCorriente}><td className="font-monospace">{cuenta.numeroCuenta}</td><td>{cuenta.cliente}</td><td><span className={`badge bg-light-${ESTADOS[cuenta.estado].color} text-${ESTADOS[cuenta.estado].color}`}>{ESTADOS[cuenta.estado].dot} {ESTADOS[cuenta.estado].label}</span></td><td className="text-end fw-bold">{moneda.format(cuenta.saldo)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p className="text-muted text-end small mt-2 mb-0">Última actualización: {new Date(data.actualizadoEn).toLocaleTimeString('es-AR')}</p>
        </>
      )}
    </div>
  );
}
