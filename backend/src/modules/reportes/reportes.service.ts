import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ZONA_HORARIA_NEGOCIO } from '../notificaciones/notificaciones.constants';
import { FiltrosRankingDto, FiltrosReportesDto } from './dto/filtros-reportes.dto';

export interface Periodo { desde: string; hasta: string }
interface FilaMensual { mes: string; tipo: string; medio: string; operaciones: string; bruto: string; devoluciones: string }
interface FilaRanking { idProducto: number; sku: string; nombre: string; categoria: string; cantidad: string; recaudacion: string }

@Injectable()
export class ReportesService {
  constructor(private readonly db: DataSource) {}

  private periodo(filtros: FiltrosReportesDto): Periodo {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA_NEGOCIO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const hasta = filtros.hasta ?? hoy;
    const base = new Date(`${hasta}T12:00:00Z`);
    base.setUTCDate(1);
    base.setUTCMonth(base.getUTCMonth() - 11);
    const desde = filtros.desde ?? `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const validar = (fecha: string) => !Number.isNaN(Date.parse(`${fecha}T12:00:00Z`)) && new Date(`${fecha}T12:00:00Z`).toISOString().startsWith(fecha);
    if (!validar(desde) || !validar(hasta) || desde > hasta ||
      (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) > 730 * 86_400_000) {
      throw new BadRequestException('El período debe ser válido y no superar 730 días.');
    }
    return { desde, hasta };
  }

  async ventasMensuales(filtros: FiltrosReportesDto) {
    const periodo = this.periodo(filtros);
    const filas = await this.db.query<FilaMensual[]>(`
      WITH movimientos AS (
        SELECT to_char(v.fecha AT TIME ZONE $3, 'YYYY-MM') mes,
          f.tipo_factura::text tipo,
          CASE WHEN v.modalidad_pago = 'CUENTA_CORRIENTE' THEN 'CUENTA_CORRIENTE'
               ELSE c.metodo_cobro::text END medio,
          1 operaciones, v.total bruto, 0::numeric devoluciones
        FROM ventas v
        JOIN facturas f ON f.id_venta = v.id_venta
        LEFT JOIN cobros c ON c.id_venta = v.id_venta
        WHERE v.estado = 'COMPLETADA'
          AND v.fecha >= ($1::date::timestamp AT TIME ZONE $3)
          AND v.fecha < (($2::date + 1)::timestamp AT TIME ZONE $3)
        UNION ALL
        SELECT to_char(n.fecha_emision AT TIME ZONE $3, 'YYYY-MM') mes,
          f.tipo_factura::text tipo,
          CASE WHEN v.modalidad_pago = 'CUENTA_CORRIENTE' THEN 'CUENTA_CORRIENTE'
               ELSE c.metodo_cobro::text END medio,
          0 operaciones, 0::numeric bruto, n.monto devoluciones
        FROM notas_credito n
        JOIN devoluciones d ON d.id_devolucion = n.id_devolucion
        JOIN detalles_venta dv ON dv.id_detalle_venta = d.id_venta_detalle
        JOIN ventas v ON v.id_venta = dv.id_venta
        JOIN facturas f ON f.id_venta = v.id_venta
        LEFT JOIN cobros c ON c.id_venta = v.id_venta
        WHERE n.fecha_emision >= ($1::date::timestamp AT TIME ZONE $3)
          AND n.fecha_emision < (($2::date + 1)::timestamp AT TIME ZONE $3)
      )
      SELECT mes, tipo, medio, SUM(operaciones)::text operaciones,
        SUM(bruto)::text bruto, SUM(devoluciones)::text devoluciones
      FROM movimientos GROUP BY mes, tipo, medio ORDER BY mes, tipo, medio
    `, [periodo.desde, periodo.hasta, ZONA_HORARIA_NEGOCIO]);
    const meses = new Map<string, {
      mes: string; operaciones: number; bruto: number; devoluciones: number; neto: number;
      comprobantes: Record<string, number>; medios: Record<string, number>;
    }>();
    for (const fila of filas) {
      const actual = meses.get(fila.mes) ?? {
        mes: fila.mes, operaciones: 0, bruto: 0, devoluciones: 0, neto: 0,
        comprobantes: {}, medios: {},
      };
      const neto = Number(fila.bruto) - Number(fila.devoluciones);
      actual.operaciones += Number(fila.operaciones);
      actual.bruto += Number(fila.bruto);
      actual.devoluciones += Number(fila.devoluciones);
      actual.neto += neto;
      actual.comprobantes[fila.tipo] = (actual.comprobantes[fila.tipo] ?? 0) + neto;
      actual.medios[fila.medio] = (actual.medios[fila.medio] ?? 0) + neto;
      meses.set(fila.mes, actual);
    }
    return { periodo, data: [...meses.values()] };
  }

  async rankingProductos(filtros: FiltrosRankingDto) {
    const periodo = this.periodo(filtros);
    const filas = await this.db.query<FilaRanking[]>(`
      WITH movimientos AS (
        SELECT dv.id_producto, dv.cantidad, dv.subtotal importe
        FROM detalles_venta dv JOIN ventas v ON v.id_venta = dv.id_venta
        WHERE v.estado = 'COMPLETADA'
          AND v.fecha >= ($1::date::timestamp AT TIME ZONE $3)
          AND v.fecha < (($2::date + 1)::timestamp AT TIME ZONE $3)
        UNION ALL
        SELECT dv.id_producto, -d.cantidad_devuelta cantidad, -n.monto importe
        FROM notas_credito n JOIN devoluciones d ON d.id_devolucion = n.id_devolucion
        JOIN detalles_venta dv ON dv.id_detalle_venta = d.id_venta_detalle
        WHERE n.fecha_emision >= ($1::date::timestamp AT TIME ZONE $3)
          AND n.fecha_emision < (($2::date + 1)::timestamp AT TIME ZONE $3)
      )
      SELECT p.id_producto "idProducto", p.sku, p.nombre, cat.nombre categoria,
        SUM(m.cantidad)::text cantidad, SUM(m.importe)::text recaudacion
      FROM movimientos m JOIN productos p ON p.id_producto=m.id_producto
      JOIN categorias cat ON cat.id_categoria=p.id_categoria
      WHERE ($4::integer IS NULL OR p.id_categoria=$4)
      GROUP BY p.id_producto, cat.nombre
      ORDER BY SUM(m.cantidad) DESC, SUM(m.importe) DESC, p.id_producto ASC LIMIT 100
    `, [periodo.desde, periodo.hasta, ZONA_HORARIA_NEGOCIO, filtros.idCategoria ?? null]);
    return { periodo, data: filas.map((fila) => ({ ...fila, cantidad: Number(fila.cantidad), recaudacion: Number(fila.recaudacion) })) };
  }
}
