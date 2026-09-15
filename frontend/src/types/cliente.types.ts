export type CondicionIva =
  | 'RESPONSABLE_INSCRIPTO'
  | 'CONSUMIDOR_FINAL'
  | 'MONOTRIBUTO'
  | 'EXENTO';

export interface CuentaCorriente {
  idCuentaCorriente: number;
  saldo: number;
  limiteCredito: number;
  activo: boolean;
}

export interface Persona {
  idPersona: number;
  nombre: string;
  apellido: string;
  cuil: string;
  dni: string;
}

export interface Cliente {
  idCliente: number;
  condicionIva: CondicionIva;
  cuentaCorrienteHabilitada: boolean;
  limiteCredito: number;
  persona: Persona;
  cuentaCorriente?: CuentaCorriente;
}

export interface CreateClientePayload {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  condicionIva: CondicionIva;
  cuentaCorrienteHabilitada?: boolean;
  limiteCredito?: number;
}
