import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { CartProvider } from './CartContext';
import { useCart } from './useCart';

const producto = {
  idProducto: 1,
  sku: 'PROD-00001',
  nombre: 'Pastillas de freno',
  descripcion: null,
  precioUnitario: 1250.5,
  stock: 3,
};

describe('CartProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('calcula importes y limita la cantidad al stock disponible', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.agregarItem(producto, 2));
    expect(result.current.totalItems).toBe(2);
    expect(result.current.total).toBe(2501);

    act(() => result.current.agregarItem(producto, 5));
    expect(result.current.items[0]?.cantidad).toBe(3);
    expect(result.current.total).toBe(3751.5);
  });

  it('elimina una línea cuando su cantidad llega a cero', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.agregarItem(producto));
    act(() => result.current.modificarCantidad(producto.idProducto, 0));
    expect(result.current.items).toHaveLength(0);
  });
});
