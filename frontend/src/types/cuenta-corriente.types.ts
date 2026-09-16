import type { ClienteResumen } from '../utils/cliente';

export type TipoMovimientoCtaCte = 'IMPUTACION_VENTA' | 'COBRO_CUENTA' | 'AJUSTE' | 'NOTA_CREDITO' | 'MORA';

export type EstadoCuentaCorriente = 'ACTIVA' | 'INACTIVA';

/** El cliente embebido en la cuenta corriente usa el modelo del módulo de clientes. */
export type CuentaCorrienteCliente = ClienteResumen;

export interface MovimientoCtaCte {
  idMovimientoCtaCte: number;
  tipo: TipoMovimientoCtaCte;
  monto: number;
  /** Compatibilidad: deuda resultante del movimiento. */
  saldoPosterior: number;
  deudaPosterior: number;
  saldoFavorPosterior: number;
  fecha: string;
  observaciones?: string | null;
}

export interface CuentaCorriente {
  idCuentaCorriente: number;
  numeroCuenta: string;
  /** Saldo a favor del cliente; no representa deuda. */
  saldo: number;
  deuda: number;
  saldoFavor: number;
  estado: EstadoCuentaCorriente;
  fechaAlta?: string | null;
  fechaBaja?: string | null;
  fechaUltimoMovimiento?: string | null;
  cliente: CuentaCorrienteCliente;
}

export interface CuentaCorrienteDetalle extends CuentaCorriente {
  movimientos: MovimientoCtaCte[];
}

export interface PagoPayload {
  monto: number;
  observaciones?: string;
}
