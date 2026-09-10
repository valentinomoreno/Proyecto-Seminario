import type { ClienteResumen } from '../utils/cliente';

export type TipoMovimientoCtaCte = 'IMPUTACION_VENTA' | 'PAGO' | 'MORA' | 'NOTA_CREDITO';

export type EstadoCuentaCorriente = 'ACTIVA' | 'INACTIVA';

/** El cliente embebido en la cuenta corriente usa el modelo del módulo de clientes. */
export type CuentaCorrienteCliente = ClienteResumen;

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
  numeroCuenta: string;
  saldo: number;
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
