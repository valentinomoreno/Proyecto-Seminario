import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/axios.instance';
import type { DashboardData, EstadoCuentaDashboard } from '../types/dashboard.types';

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const METODOS = {
  EFECTIVO: { label: 'Efectivo', color: '#10b981' },
  MERCADO_PAGO: { label: 'Mercado Pago', color: '#6366f1' },
  CUENTA_CORRIENTE: { label: 'Cuenta corriente', color: '#3b82f6' },
  OTROS: { label: 'Otros medios', color: '#94a3b8' },
} as const;

const ESTADOS = {
  AL_DIA: { label: 'Al día', color: 'success', dot: '🟢' },
  EN_COBRO: { label: 'En período de cobro', color: 'warning', dot: '🟡' },
  EN_MORA: { label: 'En mora', color: 'danger', dot: '🔴' },
} as const;

/* GRÁFICO DE LÍNEAS PARA VENTAS DIARIAS */
function GraficoVentas({ datos }: { datos: DashboardData['ventas'] }) {
  const [diaActivo, setDiaActivo] = useState<number | null>(null);
  const width = 760;
  const height = 240;
  const padding = 34;
  const maximo = Math.max(1, ...datos.puntos.flatMap((punto) => [punto.actual, punto.anterior]));
  const x = (indice: number) => padding + (indice / Math.max(1, datos.puntos.length - 1)) * (width - padding * 2);
  const y = (valor: number) => height - padding - (valor / maximo) * (height - padding * 2);
  const puntosActual = datos.puntos.map((punto, index) => `${x(index)},${y(punto.actual)}`).join(' ');
  const puntosAnterior = datos.puntos.map((punto, index) => `${x(index)},${y(punto.anterior)}`).join(' ');
  const activo = diaActivo === null ? null : datos.puntos.find((punto) => punto.dia === diaActivo);

  const polygonPoints = `${x(0)},${height - padding} ${puntosActual} ${x(datos.puntos.length - 1)},${height - padding}`;

  return (
    <div className="dashboard-chart-wrap">
      {activo && (
        <div className="dashboard-chart-tooltip shadow-sm">
          <strong>Día {activo.dia}</strong>
          <span>{datos.mesActual}: {moneda.format(activo.actual)} ({activo.operacionesActual} vtas)</span>
          <span className="text-muted">{datos.mesAnterior}: {moneda.format(activo.anterior)} ({activo.operacionesAnterior} vtas)</span>
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Comparación diaria de ventas" className="dashboard-line-chart">
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={padding} x2={width - padding} y1={y(maximo * ratio)} y2={y(maximo * ratio)} className="chart-grid-line" />
        ))}
        {/* Sombreado bajo la curva */}
        <polygon points={polygonPoints} fill="url(#salesGradient)" />
        {/* Curva mes anterior (discontinua fina y neutra) */}
        <polyline points={puntosAnterior} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
        {/* Curva mes actual (azul / violeta moderno) */}
        <polyline points={puntosActual} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {datos.puntos.map((punto, index) => (
          <g key={punto.dia} onMouseEnter={() => setDiaActivo(punto.dia)} onMouseLeave={() => setDiaActivo(null)} className="chart-point-group">
            <circle cx={x(index)} cy={y(punto.actual)} r="8" fill="transparent" />
            <circle cx={x(index)} cy={y(punto.actual)} r={diaActivo === punto.dia ? 5 : 2.5} fill="#6366f1" />
          </g>
        ))}
        {datos.puntos.filter((punto) => punto.dia === 1 || punto.dia % 5 === 0).map((punto) => (
          <text key={punto.dia} x={x(datos.puntos.indexOf(punto))} y={height - 10} textAnchor="middle" className="chart-axis-text">{punto.dia}</text>
        ))}
      </svg>
      <div className="d-flex flex-wrap gap-4 justify-content-center small mt-3">
        <span className="d-flex align-items-center gap-2">
          <span className="legend-indicator bg-primary-modern" /> {datos.mesActual}
        </span>
        <span className="d-flex align-items-center gap-2 text-muted">
          <span className="legend-indicator bg-muted-dashed" /> {datos.mesAnterior}
        </span>
      </div>
    </div>
  );
}

/* DONUT CHART PARA MÉTODOS DE PAGO */
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
    <div className="dashboard-donut-container">
      <div className="dashboard-donut-wrap">
        <div
          className="dashboard-donut mx-auto"
          style={{ background: total ? `conic-gradient(${segmentos.join(',')})` : '#e2e8f0' }}
          aria-label="Distribución de métodos de pago"
        >
          <div className="dashboard-donut-center">
            <strong className="donut-value">
              {activo
                ? `${total ? Math.round((activo.total / total) * 100) : 0}%`
                : moneda.format(total)}
            </strong>
            <span className="donut-label text-muted">
              {activo ? METODOS[activo.metodo].label : 'Total mensual'}
            </span>
            {activo && (
              <span className="donut-subvalue">
                {moneda.format(activo.total)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-payments-list">
        {metodos.map((item) => {
          const pct = total ? Math.round((item.total / total) * 100) : 0;
          const esActivo = seleccionado === item.metodo;
          return (
            <button
              type="button"
              key={item.metodo}
              className={`dashboard-payment-row ${esActivo ? 'active' : ''}`}
              onClick={() => setSeleccionado(esActivo ? null : item.metodo)}
            >
              <span className="dashboard-color-dot" style={{ backgroundColor: METODOS[item.metodo].color }} />
              <span className="payment-info text-start flex-grow-1">
                <span className="payment-name d-block">{METODOS[item.metodo].label}</span>
                <span className="payment-ops text-muted">{item.cantidad} ops · {moneda.format(item.total)}</span>
              </span>
              <span className="payment-pct badge-pct">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* BAR CHART PARA COMPARACIONES MENSUALES */
function GraficoBarrasMensuales({ datos }: { datos: DashboardData['ventas'] }) {
  const maxMonto = Math.max(1, datos.totalActual, datos.totalAnterior);
  const pctAnteriorMonto = Math.round((datos.totalAnterior / maxMonto) * 100);
  const pctActualMonto = Math.round((datos.totalActual / maxMonto) * 100);

  const maxOps = Math.max(1, datos.operacionesActual, datos.operacionesAnterior);
  const pctAnteriorOps = Math.round((datos.operacionesAnterior / maxOps) * 100);
  const pctActualOps = Math.round((datos.operacionesActual / maxOps) * 100);

  return (
    <div className="p-3">
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="small fw-semibold text-muted text-uppercase">Facturación Total</span>
          <span className="small text-muted">{moneda.format(datos.totalActual)}</span>
        </div>
        <div className="d-flex flex-column gap-2">
          <div>
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>{datos.mesAnterior}</span>
              <span>{moneda.format(datos.totalAnterior)}</span>
            </div>
            <div className="progress progress-modern">
              <div
                className="progress-bar bg-slate-subtle"
                role="progressbar"
                style={{ width: `${pctAnteriorMonto}%` }}
                aria-valuenow={pctAnteriorMonto}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
          <div>
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span className="fw-semibold text-primary">{datos.mesActual}</span>
              <span className="fw-semibold text-primary">{moneda.format(datos.totalActual)}</span>
            </div>
            <div className="progress progress-modern">
              <div
                className="progress-bar bg-accent-violet"
                role="progressbar"
                style={{ width: `${pctActualMonto}%` }}
                aria-valuenow={pctActualMonto}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="small fw-semibold text-muted text-uppercase">Cantidad de Operaciones</span>
          <span className="small text-muted">{datos.operacionesActual} vtas</span>
        </div>
        <div className="d-flex flex-column gap-2">
          <div>
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>{datos.mesAnterior}</span>
              <span>{datos.operacionesAnterior} ventas</span>
            </div>
            <div className="progress progress-modern">
              <div
                className="progress-bar bg-slate-subtle"
                role="progressbar"
                style={{ width: `${pctAnteriorOps}%` }}
                aria-valuenow={pctAnteriorOps}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
          <div>
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span className="fw-semibold text-primary">{datos.mesActual}</span>
              <span className="fw-semibold text-primary">{datos.operacionesActual} ventas</span>
            </div>
            <div className="progress progress-modern">
              <div
                className="progress-bar bg-accent-blue"
                role="progressbar"
                style={{ width: `${pctActualOps}%` }}
                aria-valuenow={pctActualOps}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
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

  if (cargando && !data) {
    return (
      <div className="card modern-card border-0 p-5 text-center text-muted">
        <span className="spinner-border spinner-border-sm mx-auto mb-2" />
        Cargando métricas…
      </div>
    );
  }

  return (
    <div className="dashboard-page modern-dashboard">
      {/* 3) HERO DEL DASHBOARD */}
      <div className="dashboard-hero-block mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h1 className="dashboard-hero-title mb-1">Dashboard de Administración</h1>
            <p className="dashboard-hero-subtitle text-muted mb-0">
              Métricas operativas actualizadas cada 30 segundos.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2 btn-refresh-hero"
            onClick={() => void cargar(true)}
            disabled={actualizando}
          >
            <i className={`ti ti-refresh ${actualizando ? 'dashboard-spin' : ''}`} />
            <span>Actualizar ahora</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger shadow-sm">{error}</div>}

      {data && (
        <>
          {/* 4) CARDS DE MÉTRICAS (ESTILO FIGMA / LINEAR) */}
          <div className="row g-3 mb-4">
            {/* Ventas del mes */}
            <div className="col-sm-6 col-xl-3">
              <div className="kpi-linear-card">
                <div className="kpi-header">
                  <span className="kpi-label">Ventas del mes</span>
                  <span className="kpi-tag tag-violet">
                    {variacion !== null ? `${variacion >= 0 ? '+' : ''}${variacion.toFixed(0)}%` : 'Mensual'}
                  </span>
                </div>
                <div className="kpi-value-row">
                  <strong className="kpi-value">{moneda.format(data.ventas.totalActual)}</strong>
                  <i className="ti ti-cash kpi-subtle-icon" />
                </div>
                <span className="kpi-subtext">{data.ventas.operacionesActual} operaciones registradas</span>
              </div>
            </div>

            {/* Variación mensual */}
            <div className="col-sm-6 col-xl-3">
              <div className="kpi-linear-card">
                <div className="kpi-header">
                  <span className="kpi-label">Variación mensual</span>
                  <span className={`kpi-tag ${variacion && variacion >= 0 ? 'tag-green' : 'tag-neutral'}`}>
                    Tendencia
                  </span>
                </div>
                <div className="kpi-value-row">
                  <strong className="kpi-value">
                    {variacion === null ? 'Sin base' : `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`}
                  </strong>
                  <i className="ti ti-trending-up kpi-subtle-icon" />
                </div>
                <span className="kpi-subtext">Comparado contra {data.ventas.mesAnterior}</span>
              </div>
            </div>

            {/* Cuentas en mora */}
            <div className="col-sm-6 col-xl-3">
              <div className="kpi-linear-card">
                <div className="kpi-header">
                  <span className="kpi-label">Cuentas en mora</span>
                  <span className="kpi-tag tag-red">
                    {data.cuentas.resumen.enMora > 0 ? 'Riesgo' : 'Al día'}
                  </span>
                </div>
                <div className="kpi-value-row">
                  <strong className="kpi-value">{data.cuentas.resumen.enMora}</strong>
                  <i className="ti ti-alert-circle kpi-subtle-icon" />
                </div>
                <span className="kpi-subtext">A partir del día {data.cuentas.diaInicioMora} del mes</span>
              </div>
            </div>

            {/* Alertas de stock */}
            <div className="col-sm-6 col-xl-3">
              <Link to="/stock/alertas" className="kpi-linear-card text-decoration-none kpi-link-card">
                <div className="kpi-header">
                  <span className="kpi-label">Alertas de stock</span>
                  <span className="kpi-tag tag-amber">Inventario</span>
                </div>
                <div className="kpi-value-row">
                  <strong className="kpi-value">{data.inventario.alertasStock}</strong>
                  <i className="ti ti-alert-triangle kpi-subtle-icon" />
                </div>
                <span className="kpi-subtext text-primary">Ver sugerido de compra →</span>
              </Link>
            </div>
          </div>

          {/* 5) GRÁFICOS MODERNOS */}
          <div className="row g-4 mb-4">
            {/* Gráfico 1: Ventas por día (Line Chart) */}
            <div className="col-xl-8">
              <div className="card modern-card border-0 h-100">
                <div className="card-header border-0 pt-4 px-4 bg-transparent">
                  <h2 className="fs-5 fw-bold mb-1">Volumen de ventas</h2>
                  <p className="small text-muted mb-0">Monto facturado por día, mes actual vs. anterior.</p>
                </div>
                <div className="card-body px-4 pb-4">
                  <GraficoVentas datos={data.ventas} />
                </div>
              </div>
            </div>

            {/* Gráfico 2: Métodos de pago (Donut Chart) */}
            <div className="col-xl-4">
              <div className="card modern-card border-0 h-100">
                <div className="card-header border-0 pt-4 px-4 bg-transparent">
                  <h2 className="fs-5 fw-bold mb-1">Métodos de pago</h2>
                  <p className="small text-muted mb-0">Distribución sobre el monto del mes.</p>
                </div>
                <div className="card-body px-4 pb-4">
                  <DonaPagos metodos={data.metodosPago} />
                </div>
              </div>
            </div>
          </div>

          {/* Comparación mensual en barra */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card modern-card border-0">
                <div className="card-header border-0 pt-4 px-4 bg-transparent">
                  <h2 className="fs-5 fw-bold mb-1">Comparativa mensual</h2>
                  <p className="small text-muted mb-0">Rendimiento acumulado contra el mes precedente.</p>
                </div>
                <div className="card-body px-4 pb-4">
                  <GraficoBarrasMensuales datos={data.ventas} />
                </div>
              </div>
            </div>
          </div>

          {/* 6) SEMÁFORO DE CUENTAS CORRIENTES CON FILTRO PILL */}
          <div className="card modern-card border-0">
            <div className="card-header border-bottom p-4 bg-transparent">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h2 className="fs-5 fw-bold mb-1">Semáforo de cuentas corrientes</h2>
                  <p className="small text-muted mb-0">Seleccione un filtro visual para auditar el detalle de clientes.</p>
                </div>
                {/* BOTONES TIPO PILL: 🟢 🟡 🔴 */}
                <div className="d-flex flex-wrap gap-2">
                  {(['AL_DIA', 'EN_COBRO', 'EN_MORA'] as EstadoCuentaDashboard[]).map((estado) => {
                    const cantidad =
                      estado === 'AL_DIA'
                        ? data.cuentas.resumen.alDia
                        : estado === 'EN_COBRO'
                          ? data.cuentas.resumen.enCobro
                          : data.cuentas.resumen.enMora;
                    const activo = filtroEstado === estado;
                    return (
                      <button
                        type="button"
                        key={estado}
                        className={`btn-filter-pill ${estado.toLowerCase()} ${activo ? 'active' : ''}`}
                        onClick={() => setFiltroEstado(activo ? null : estado)}
                        aria-pressed={activo}
                      >
                        <span className="pill-dot">{ESTADOS[estado].dot}</span>
                        <span className="pill-label">{ESTADOS[estado].label}</span>
                        <span className="pill-count">{cantidad}</span>
                      </button>
                    );
                  })}
                  {filtroEstado && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-muted text-decoration-none px-2"
                      onClick={() => setFiltroEstado(null)}
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              {cuentasFiltradas.length === 0 ? (
                /* EMPTY STATE ELEGANTE */
                <div className="empty-state-box text-center py-5">
                  <div className="empty-state-icon mb-3">
                    <i className="ti ti-check-circle" />
                  </div>
                  <h5 className="fw-semibold mb-1">No hay cuentas en este estado</h5>
                  <p className="text-muted small mb-0">
                    No se encontraron clientes que coincidan con el criterio seleccionado.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table modern-table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Cuenta</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th className="text-end">Saldo pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasFiltradas.slice(0, 15).map((cuenta) => (
                        <tr key={cuenta.idCuentaCorriente}>
                          <td className="font-monospace text-muted">{cuenta.numeroCuenta}</td>
                          <td className="fw-medium">{cuenta.cliente}</td>
                          <td>
                            <span className={`status-badge-pill ${ESTADOS[cuenta.estado].color}`}>
                              {ESTADOS[cuenta.estado].dot} {ESTADOS[cuenta.estado].label}
                            </span>
                          </td>
                          <td className="text-end fw-bold font-monospace">{moneda.format(cuenta.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center text-muted small mt-3 px-1">
            <span>Inter / Tipografía moderna</span>
            <span>Última actualización: {new Date(data.actualizadoEn).toLocaleTimeString('es-AR')}</span>
          </div>
        </>
      )}
    </div>
  );
}
