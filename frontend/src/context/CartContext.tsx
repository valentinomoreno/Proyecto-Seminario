import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ProductoCatalogo } from '../types/producto.types';
import { CartContext, type CartItem } from './cart-context';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const agregarItem = useCallback((producto: ProductoCatalogo, cantidad = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.idProducto === producto.idProducto);
      if (existing) {
        const nuevaCantidad = Math.min(existing.cantidad + cantidad, producto.stock);
        return prev.map((item) =>
          item.idProducto === producto.idProducto
            ? {
                ...item,
                cantidad: nuevaCantidad,
                subtotal: Math.round(nuevaCantidad * item.precioUnitario * 100) / 100,
              }
            : item,
        );
      }

      const cantidadInicial = Math.min(cantidad, producto.stock);
      if (cantidadInicial <= 0) return prev;

      const newItem: CartItem = {
        idProducto: producto.idProducto,
        sku: producto.sku,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precioUnitario: producto.precioUnitario,
        stock: producto.stock,
        imagenUrl: producto.imagenUrl,
        categoria: producto.categoria,
        marca: producto.marca,
        cantidad: cantidadInicial,
        subtotal: Math.round(cantidadInicial * producto.precioUnitario * 100) / 100,
      };

      return [...prev, newItem];
    });
  }, []);

  const modificarCantidad = useCallback((idProducto: number, cantidad: number) => {
    setItems((prev) => {
      if (cantidad <= 0) {
        return prev.filter((item) => item.idProducto !== idProducto);
      }
      return prev.map((item) => {
        if (item.idProducto === idProducto) {
          const clamped = Math.min(cantidad, item.stock);
          return {
            ...item,
            cantidad: clamped,
            subtotal: Math.round(clamped * item.precioUnitario * 100) / 100,
          };
        }
        return item;
      });
    });
  }, []);

  const eliminarItem = useCallback((idProducto: number) => {
    setItems((prev) => prev.filter((item) => item.idProducto !== idProducto));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setItems([]);
  }, []);

  const { totalItems, subtotal, total } = useMemo(() => {
    let cant = 0;
    let sum = 0;
    for (const item of items) {
      cant += item.cantidad;
      sum += item.subtotal;
    }
    const totalRedondeado = Math.round(sum * 100) / 100;
    return {
      totalItems: cant,
      subtotal: totalRedondeado,
      total: totalRedondeado,
    };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      total,
      agregarItem,
      modificarCantidad,
      eliminarItem,
      limpiarCarrito,
    }),
    [items, totalItems, subtotal, total, agregarItem, modificarCantidad, eliminarItem, limpiarCarrito],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
