import { api } from './axios.instance';
import type { OrdenQr } from '../types/pagos.types';

export const pagosApi = {
  async crear(idCliente: number, items: Array<{ idProducto: number; cantidad: number }>, clave: string): Promise<OrdenQr> {
    const { data } = await api.post<OrdenQr>('/pagos/mercado-pago/ordenes', { idCliente, items }, {
      headers: { 'Idempotency-Key': clave },
    });
    return data;
  },
  async estado(id: string): Promise<OrdenQr> {
    const { data } = await api.get<OrdenQr>(`/pagos/mercado-pago/ordenes/${id}`);
    return data;
  },
  async estadoPorClave(clave: string): Promise<OrdenQr> {
    const { data } = await api.get<OrdenQr>(`/pagos/mercado-pago/ordenes/clave/${clave}`);
    return data;
  },
  async cancelar(id: string): Promise<OrdenQr> {
    const { data } = await api.post<OrdenQr>(`/pagos/mercado-pago/ordenes/${id}/cancelar`);
    return data;
  },
};
