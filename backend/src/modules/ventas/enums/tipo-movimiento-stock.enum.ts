export enum TipoMovimientoStock {
  SALIDA_VENTA = 'SALIDA_VENTA',
  ENTRADA_COMPRA = 'ENTRADA_COMPRA',
  AJUSTE_POSITIVO = 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO = 'AJUSTE_NEGATIVO',
  // Reingreso de stock por un producto devuelto apto para reventa.
  ENTRADA_DEVOLUCION = 'ENTRADA_DEVOLUCION',
}
