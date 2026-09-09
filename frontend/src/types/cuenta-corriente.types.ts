export type TipoMovimientoCtaCte = 'IMPUTACION_VENTA' | 'PAGO' | 'MORA' | 'NOTA_CREDITO';

export interface CuentaCorrienteCliente {
  idCliente: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface MovimientoCtaCte {
  idMovimientoCtaCte: number;
  tipo: TipoMovimientoCtaCte;
  monto: number;
  saldoResultante: number;
  fecha: string;
  observaciones?: string | null;
}

export interface CuentaCorriente {
  idCuentaCorriente: number;
  saldo: number;
  fechaUltimoMovimiento: string | null;
  cliente: CuentaCorrienteCliente;
}

export interface CuentaCorrienteDetalle extends CuentaCorriente {
  movimientos: MovimientoCtaCte[];
}

export interface PagoPayload {
  monto: number;
  observaciones?: string;
}
