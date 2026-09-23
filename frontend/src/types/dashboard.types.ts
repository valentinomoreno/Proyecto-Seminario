export type EstadoCuentaDashboard = 'AL_DIA' | 'EN_COBRO' | 'EN_MORA';

export interface DashboardData {
  actualizadoEn: string;
  ventas: {
    mesActual: string;
    mesAnterior: string;
    totalActual: number;
    totalAnterior: number;
    operacionesActual: number;
    operacionesAnterior: number;
    puntos: Array<{
      dia: number;
      actual: number;
      anterior: number;
      operacionesActual: number;
      operacionesAnterior: number;
    }>;
  };
  metodosPago: Array<{
    metodo: 'EFECTIVO' | 'MERCADO_PAGO' | 'CUENTA_CORRIENTE' | 'OTROS';
    cantidad: number;
    total: number;
  }>;
  cuentas: {
    diaInicioMora: number;
    resumen: { alDia: number; enCobro: number; enMora: number };
    clientes: Array<{
      idCuentaCorriente: number;
      numeroCuenta: string;
      cliente: string;
      saldo: number;
      estado: EstadoCuentaDashboard;
    }>;
  };
  inventario: { alertasStock: number };
}
