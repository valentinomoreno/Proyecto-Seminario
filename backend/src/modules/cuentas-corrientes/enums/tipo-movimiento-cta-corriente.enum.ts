export enum TipoMovimientoCtaCorriente {
  IMPUTACION_VENTA = 'IMPUTACION_VENTA',
  COBRO_CUENTA = 'COBRO_CUENTA',
  AJUSTE = 'AJUSTE',
  // Agregados para Devoluciones (nota de crédito) y el proceso mensual de mora.
  NOTA_CREDITO = 'NOTA_CREDITO',
  MORA = 'MORA',
}
