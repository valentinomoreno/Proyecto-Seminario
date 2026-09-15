export type TipoCliente = 'PERSONA' | 'EMPRESA';
export type EstadoCuenta = 'SIN_CUENTA' | 'ACTIVA' | 'INACTIVA';
export interface CondicionIva {
  idCondicionIva: number;
  codigo: string;
  nombre: string;
}

export interface ClientePersona {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
}

export interface ClienteEmpresa {
  cuit: string;
  razonSocial: string;
  personaContacto: string;
}

export interface CuentaCorrienteResumen {
  idCuentaCorriente: number;
  numeroCuenta: string;
  saldo: number;
  limiteCredito?: number;
  creditoDisponible?: number;
  estado: Exclude<EstadoCuenta, 'SIN_CUENTA'>;
}

export interface Cliente {
  idCliente: number;
  tipo: TipoCliente;
  nombreMostrar: string;
  condicionIva: CondicionIva;
  contacto: {
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
  };
  persona: ClientePersona | null;
  empresa: ClienteEmpresa | null;
  estadoCuenta: EstadoCuenta;
  cuentaCorriente: CuentaCorrienteResumen | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ContactoClientePayload {
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

export interface CreateClientePersonaPayload extends ContactoClientePayload {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  condicionIvaId: number;
  cuentaCorrienteHabilitada?: boolean;
  limiteCredito?: number;
}

export interface CreateClienteEmpresaPayload extends ContactoClientePayload {
  cuit: string;
  razonSocial: string;
  personaContacto: string;
  condicionIvaId: number;
  cuentaCorrienteHabilitada?: boolean;
  limiteCredito?: number;
}
