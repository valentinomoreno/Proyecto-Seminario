import { excedeLimiteCredito } from './limite-credito.util';

describe('excedeLimiteCredito', () => {
  it('permite compras cuando la cuenta no tiene un tope configurado', () => {
    expect(excedeLimiteCredito(150000, 0)).toBe(false);
  });

  it('mantiene el control cuando existe un límite positivo', () => {
    expect(excedeLimiteCredito(100000, 100000)).toBe(false);
    expect(excedeLimiteCredito(100000.01, 100000)).toBe(true);
  });
});
