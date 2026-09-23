import { DataSource } from 'typeorm';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('consolida ventas, métodos de pago, cuentas y alertas', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([
        { periodo: 'actual', dia: 1, cantidad: '2', total: '15000' },
        { periodo: 'anterior', dia: 1, cantidad: '1', total: '5000' },
      ])
      .mockResolvedValueOnce([
        { metodo: 'EFECTIVO', cantidad: '2', total: '15000' },
      ])
      .mockResolvedValueOnce([
        { idCuentaCorriente: 1, numeroCuenta: 'CC-000001', saldo: '0', nombreCliente: 'Cliente al día' },
        { idCuentaCorriente: 2, numeroCuenta: 'CC-000002', saldo: '1000', nombreCliente: 'Cliente deudor' },
      ])
      .mockResolvedValueOnce([{ total: '3' }]);
    const service = new DashboardService({ query } as unknown as DataSource);

    const resultado = await service.obtener();

    expect(resultado.ventas.totalActual).toBe(15000);
    expect(resultado.metodosPago.find((item) => item.metodo === 'EFECTIVO')?.cantidad).toBe(2);
    expect(resultado.cuentas.resumen.alDia).toBe(1);
    expect(resultado.cuentas.clientes.find((item) => item.numeroCuenta === 'CC-000002')?.estado)
      .toMatch(/EN_COBRO|EN_MORA/);
    expect(resultado.inventario.alertasStock).toBe(3);
  });
});
