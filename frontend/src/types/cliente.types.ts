export interface Cliente {
  idCliente: number;
  nombre: string;
  apellido: string;
  dniCuit: string;
  email: string;
  telefono?: string | null;
  activo: boolean;
  saldoCuentaCorriente: number;
}

export interface ClientePayload {
  nombre: string;
  apellido: string;
  dniCuit: string;
  email: string;
  telefono?: string;
}
