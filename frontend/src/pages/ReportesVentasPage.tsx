import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getApiErrorMessage } from '../api/axios.instance';
import { descargarCsv, reportesApi, type MesVentas, type Periodo } from '../api/reportes.service';
import { FiltroPeriodoReportes } from '../components/FiltroPeriodoReportes';

const moneda = (valor: number) => valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
function periodoInicial(): Periodo {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1);
  const formato = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  return { desde: formato(desde), hasta: formato(hoy) };
}

export function ReportesVentasPage() {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [filas, setFilas] = useState<MesVentas[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const buscar = useCallback(async (filtro: Periodo) => {
    setCargando(true);
    setError('');
    try { setFilas((await reportesApi.ventasMensuales(filtro)).data); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { void buscar(periodoInicial()); }, [buscar]);

  return <div className="container-fluid report-page">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div><span className="dashboard-eyebrow">INFORMES</span><h1 className="dashboard-hero-title mb-1">Ventas mensuales</h1><p className="text-muted mb-0">Evolución de ventas netas, comprobantes y medios de cobro.</p></div>
      <button className="btn btn-outline-primary" disabled={!filas.length} onClick={() => descargarCsv('ventas-mensuales.csv',
        ['Mes', 'Operaciones', 'Bruto', 'Devoluciones', 'Neto', 'Factura A', 'Factura B', 'Factura C', 'Remito', 'Efectivo', 'Tarjeta crédito', 'Tarjeta débito', 'Transferencia', 'Mercado Pago', 'Cuenta corriente'],
        filas.map((f) => [f.mes, f.operaciones, f.bruto, f.devoluciones, f.neto,
          f.comprobantes.FACTURA_A ?? 0, f.comprobantes.FACTURA_B ?? 0, f.comprobantes.FACTURA_C ?? 0, f.comprobantes.REMITO ?? 0,
          f.medios.EFECTIVO ?? 0, f.medios.TARJETA_CREDITO ?? 0, f.medios.TARJETA_DEBITO ?? 0,
          f.medios.TRANSFERENCIA ?? 0, f.medios.MERCADO_PAGO ?? 0, f.medios.CUENTA_CORRIENTE ?? 0]))}>Exportar CSV</button>
    </div>
    <FiltroPeriodoReportes periodo={periodo} onChange={setPeriodo} onBuscar={() => void buscar(periodo)} cargando={cargando} />
    {error && <div className="alert alert-danger">{error}</div>}
    {!cargando && !filas.length && !error && <p className="text-muted">No hay movimientos en el período.</p>}
    {!!filas.length && <>
      <div className="card mb-4"><div className="card-body" style={{ height: 330 }}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={filas}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(value) => moneda(Number(value))} />
          <Legend /><Bar dataKey="bruto" name="Ventas brutas" fill="#7659d5" radius={[5, 5, 0, 0]} /><Bar dataKey="devoluciones" name="Devoluciones" fill="#d8c4fa" radius={[5, 5, 0, 0]} />
        </BarChart></ResponsiveContainer>
      </div></div>
      <div className="table-responsive"><table className="table table-striped align-middle">
        <thead><tr><th>Mes</th><th>Operaciones</th><th>Bruto</th><th>Devoluciones</th><th>Neto</th><th>Facturas A/B/C</th><th>Remitos</th><th>Medios de cobro</th></tr></thead>
        <tbody>{filas.map((f) => <tr key={f.mes}><td>{f.mes}</td><td>{f.operaciones}</td><td>{moneda(f.bruto)}</td><td>{moneda(f.devoluciones)}</td><td className="fw-bold">{moneda(f.neto)}</td>
          <td>{['FACTURA_A', 'FACTURA_B', 'FACTURA_C'].map((tipo) => `${tipo.slice(-1)}: ${moneda(f.comprobantes[tipo] ?? 0)}`).join(' · ')}</td>
          <td>{moneda(f.comprobantes.REMITO ?? 0)}</td><td>{Object.entries(f.medios).map(([medio, monto]) => `${medio.replaceAll('_', ' ')}: ${moneda(monto)}`).join(' · ')}</td></tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}
