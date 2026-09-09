export interface NotaCredito {
  idNotaCredito: number;
  numero: string;
  monto: number;
  fechaEmision: string;
  estado: string;
}

export interface DevolucionVenta {
  idVenta: number;
  numeroComprobante: string;
  fecha: string;
}

export interface DevolucionProducto {
  idProducto: number;
  sku: string;
  nombre: string;
}

export interface DevolucionEmpleado {
  idEmpleado: number;
  legajo: string;
}

export interface Devolucion {
  idDevolucion: number;
  fecha: string;
  cantidadDevuelta: number;
  motivo: string;
  montoDevuelto: number;
  aptoReingreso: boolean;
  venta: DevolucionVenta;
  producto: DevolucionProducto;
  empleadoAutoriza: DevolucionEmpleado;
  notaCredito: NotaCredito;
}

export interface DevolucionPayload {
  idVentaDetalle: number;
  cantidad: number;
  motivo: string;
  aptoReingreso: boolean;
}
