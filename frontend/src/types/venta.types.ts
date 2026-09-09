export interface VentaCliente {
  idCliente: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface VentaEmpleado {
  idEmpleado: number;
  legajo: string;
}

export interface VentaDetalleProducto {
  idProducto: number;
  sku: string;
  nombre: string;
}

export interface VentaDetalle {
  idVentaDetalle: number;
  cantidad: number;
  cantidadDevuelta: number;
  cantidadDisponibleDevolucion: number;
  precioUnitario: number;
  subtotal: number;
  producto: VentaDetalleProducto;
}

export interface Venta {
  idVenta: number;
  numeroComprobante: string;
  fecha: string;
  total: number;
  estado: string;
  cliente: VentaCliente;
  empleado: VentaEmpleado;
  detalles: VentaDetalle[];
}

export interface VentaItemPayload {
  idProducto: number;
  cantidad: number;
}

export interface VentaPayload {
  idCliente: number;
  items: VentaItemPayload[];
}
