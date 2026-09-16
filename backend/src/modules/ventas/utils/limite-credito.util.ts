/**
 * El valor cero se usa como "sin tope configurado" para las cuentas habilitadas
 * desde Clientes. Un valor positivo conserva el control de crédito tradicional.
 */
export function excedeLimiteCredito(saldoPosterior: number, limiteCredito: number): boolean {
  return limiteCredito > 0 && saldoPosterior > limiteCredito;
}
