import type { ClienteEmpresa, ClientePersona, CondicionIva, TipoCliente } from './cliente.types';

export type ModalidadPago = 'CONTADO' | 'CUENTA_CORRIENTE';
export type MetodoCobro =
  | 'EFECTIVO'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'TRANSFERENCIA';
export type TipoFactura = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'REMITO';
export type EstadoVenta = 'COMPLETADA' | 'CANCELADA';

export interface DetalleVentaResponse {
  idDetalleVenta: number;
  producto: {
    idProducto: number;
    sku: string;
    nombre: string;
  };
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaResponse {
  idFactura: number;
  tipoFactura: TipoFactura;
  numeroFactura: string;
  fechaEmision: string;
  subtotal: number;
  iva: number;
  total: number;
  cae?: string | null;
  fechaVencimientoCae?: string | null;
}

export interface CobroResponse {
  idCobro: number;
  metodoCobro: MetodoCobro;
  monto: number;
  fecha: string;
  referencia?: string | null;
}

export interface VentaResponse {
  idVenta: number;
  numeroVenta: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  modalidadPago: ModalidadPago;
  estado: EstadoVenta;
  cliente: {
    idCliente: number;
    tipo: TipoCliente;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
    condicionIva: CondicionIva;
    persona: ClientePersona | null;
    empresa: ClienteEmpresa | null;
  };
  detalles: DetalleVentaResponse[];
  cobro?: CobroResponse;
  factura?: FacturaResponse;
}

export interface CreateVentaPayload {
  idCliente: number;
  modalidadPago: ModalidadPago;
  metodoCobro?: MetodoCobro;
  referenciaPago?: string;
  items: Array<{
    idProducto: number;
    cantidad: number;
  }>;
}
