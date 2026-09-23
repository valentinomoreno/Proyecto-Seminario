import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DIA_INICIO_MORA, ZONA_HORARIA_NEGOCIO } from '../notificaciones/notificaciones.constants';

interface VentaDiariaRaw {
  periodo: 'actual' | 'anterior';
  dia: number;
  cantidad: string;
  total: string;
}

interface MetodoPagoRaw {
  metodo: 'EFECTIVO' | 'MERCADO_PAGO' | 'CUENTA_CORRIENTE' | 'OTROS';
  cantidad: string;
  total: string;
}

interface CuentaRaw {
  idCuentaCorriente: number;
  numeroCuenta: string;
  saldo: string;
  nombreCliente: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async obtener() {
    const [ventas, metodos, cuentas, alertasStock] = await Promise.all([
      this.ventasPorDia(),
      this.metodosPago(),
      this.cuentasSemaforo(),
      this.contarAlertasStock(),
    ]);
    const diaMes = Number(new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      timeZone: ZONA_HORARIA_NEGOCIO,
    }).format(new Date()));
    const enMora = diaMes >= DIA_INICIO_MORA;
    const deudores = cuentas.map((cuenta) => {
      const saldo = Number(cuenta.saldo);
      return {
        idCuentaCorriente: cuenta.idCuentaCorriente,
        numeroCuenta: cuenta.numeroCuenta,
        cliente: cuenta.nombreCliente,
        saldo,
        estado: saldo <= 0 ? 'AL_DIA' : enMora ? 'EN_MORA' : 'EN_COBRO',
      };
    });

    return {
      actualizadoEn: new Date().toISOString(),
      ventas,
      metodosPago: metodos,
      cuentas: {
        diaInicioMora: DIA_INICIO_MORA,
        resumen: {
          alDia: deudores.filter((item) => item.estado === 'AL_DIA').length,
          enCobro: deudores.filter((item) => item.estado === 'EN_COBRO').length,
          enMora: deudores.filter((item) => item.estado === 'EN_MORA').length,
        },
        clientes: deudores,
      },
      inventario: { alertasStock },
    };
  }

  private async ventasPorDia() {
    const filas = await this.dataSource.query<VentaDiariaRaw[]>(`
      WITH limites AS (
        SELECT
          date_trunc('month', NOW() AT TIME ZONE $1) AT TIME ZONE $1 AS inicio_actual,
          (date_trunc('month', NOW() AT TIME ZONE $1) - INTERVAL '1 month') AT TIME ZONE $1 AS inicio_anterior,
          (date_trunc('month', NOW() AT TIME ZONE $1) + INTERVAL '1 month') AT TIME ZONE $1 AS fin_actual
      )
      SELECT
        CASE WHEN venta.fecha >= limites.inicio_actual THEN 'actual' ELSE 'anterior' END AS periodo,
        EXTRACT(DAY FROM venta.fecha AT TIME ZONE $1)::int AS dia,
        COUNT(*)::text AS cantidad,
        COALESCE(SUM(venta.total), 0)::text AS total
      FROM ventas venta
      CROSS JOIN limites
      WHERE venta.fecha >= limites.inicio_anterior
        AND venta.fecha < limites.fin_actual
        AND venta.estado = 'COMPLETADA'
      GROUP BY periodo, dia
      ORDER BY periodo, dia
    `, [ZONA_HORARIA_NEGOCIO]);

    const ahora = new Date();
    const mesActual = Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: ZONA_HORARIA_NEGOCIO }).format(ahora));
    const anioActual = Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: ZONA_HORARIA_NEGOCIO }).format(ahora));
    const fechaMesAnterior = new Date(Date.UTC(anioActual, mesActual - 2, 1));
    const diasActual = new Date(Date.UTC(anioActual, mesActual, 0)).getUTCDate();
    const diasAnterior = new Date(Date.UTC(
      fechaMesAnterior.getUTCFullYear(),
      fechaMesAnterior.getUTCMonth() + 1,
      0,
    )).getUTCDate();
    const cantidadDias = Math.max(diasActual, diasAnterior);
    const puntos = Array.from({ length: cantidadDias }, (_, index) => {
      const dia = index + 1;
      const actual = filas.find((fila) => fila.periodo === 'actual' && Number(fila.dia) === dia);
      const anterior = filas.find((fila) => fila.periodo === 'anterior' && Number(fila.dia) === dia);
      return {
        dia,
        actual: Number(actual?.total ?? 0),
        anterior: Number(anterior?.total ?? 0),
        operacionesActual: Number(actual?.cantidad ?? 0),
        operacionesAnterior: Number(anterior?.cantidad ?? 0),
      };
    });
    const sumar = (periodo: 'actual' | 'anterior', campo: 'total' | 'cantidad') =>
      filas.filter((fila) => fila.periodo === periodo).reduce((total, fila) => total + Number(fila[campo]), 0);
    return {
      mesActual: new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: ZONA_HORARIA_NEGOCIO }).format(ahora),
      mesAnterior: new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(fechaMesAnterior),
      totalActual: sumar('actual', 'total'),
      totalAnterior: sumar('anterior', 'total'),
      operacionesActual: sumar('actual', 'cantidad'),
      operacionesAnterior: sumar('anterior', 'cantidad'),
      puntos,
    };
  }

  private async metodosPago() {
    const filas = await this.dataSource.query<MetodoPagoRaw[]>(`
      WITH limites AS (
        SELECT
          date_trunc('month', NOW() AT TIME ZONE $1) AT TIME ZONE $1 AS inicio,
          (date_trunc('month', NOW() AT TIME ZONE $1) + INTERVAL '1 month') AT TIME ZONE $1 AS fin
      )
      SELECT
        CASE
          WHEN venta.modalidad_pago = 'CUENTA_CORRIENTE' THEN 'CUENTA_CORRIENTE'
          WHEN cobro.metodo_cobro = 'EFECTIVO' THEN 'EFECTIVO'
          WHEN cobro.metodo_cobro = 'MERCADO_PAGO' THEN 'MERCADO_PAGO'
          ELSE 'OTROS'
        END AS metodo,
        COUNT(*)::text AS cantidad,
        COALESCE(SUM(venta.total), 0)::text AS total
      FROM ventas venta
      CROSS JOIN limites
      LEFT JOIN cobros cobro ON cobro.id_venta = venta.id_venta
      WHERE venta.fecha >= limites.inicio
        AND venta.fecha < limites.fin
        AND venta.estado = 'COMPLETADA'
      GROUP BY metodo
      ORDER BY metodo
    `, [ZONA_HORARIA_NEGOCIO]);
    const metodos = ['EFECTIVO', 'MERCADO_PAGO', 'CUENTA_CORRIENTE', 'OTROS'] as const;
    return metodos.map((metodo) => {
      const fila = filas.find((item) => item.metodo === metodo);
      return { metodo, cantidad: Number(fila?.cantidad ?? 0), total: Number(fila?.total ?? 0) };
    });
  }

  private async cuentasSemaforo(): Promise<CuentaRaw[]> {
    return this.dataSource.query<CuentaRaw[]>(`
      SELECT
        cuenta.id_cuenta_corriente AS "idCuentaCorriente",
        cuenta.numero_cuenta AS "numeroCuenta",
        cuenta.saldo::text AS saldo,
        CASE
          WHEN cliente.tipo = 'PERSONA' THEN CONCAT_WS(', ', persona.apellido, persona.nombre)
          ELSE empresa.razon_social
        END AS "nombreCliente"
      FROM cuentas_corrientes cuenta
      INNER JOIN clientes cliente ON cliente.id_cliente = cuenta.id_cliente AND cliente.fecha_baja IS NULL
      LEFT JOIN clientes_persona persona ON persona.id_cliente = cliente.id_cliente
      LEFT JOIN clientes_empresa empresa ON empresa.id_cliente = cliente.id_cliente
      WHERE cuenta.activa = true
      ORDER BY cuenta.saldo DESC, "nombreCliente" ASC
    `);
  }

  private async contarAlertasStock(): Promise<number> {
    const resultado = await this.dataSource.query<Array<{ total: string }>>(`
      SELECT COUNT(*)::text AS total
      FROM productos
      WHERE fecha_baja IS NULL AND stock <= stock_minimo
    `);
    return Number(resultado[0]?.total ?? 0);
  }
}
