import { createContext } from 'react';
import type { ProductoCatalogo } from '../types/producto.types';

export interface CartItem {
  idProducto: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precioUnitario: number;
  stock: number;
  imagenUrl?: string | null;
  categoria?: { idCategoria: number; nombre: string };
  marca?: { idMarca: number; nombre: string };
  cantidad: number;
  subtotal: number;
}

export interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  total: number;
  agregarItem: (producto: ProductoCatalogo, cantidad?: number) => void;
  modificarCantidad: (idProducto: number, cantidad: number) => void;
  eliminarItem: (idProducto: number) => void;
  limpiarCarrito: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
