import { api } from './axios.instance';
import type { CreateVentaPayload, VentaResponse } from '../types/venta.types';

export const ventasApi = {
  async getVentas(buscar?: string, page = 1, limit = 20): Promise<{ data: VentaResponse[]; meta: any }> {
    const params: Record<string, string | number> = { page, limit };
    if (buscar) params.buscar = buscar;
    const response = await api.get<{ data: VentaResponse[]; meta: any }>('/ventas', { params });
    return response.data;
  },

  async getVenta(id: number): Promise<VentaResponse> {
    const response = await api.get<VentaResponse>(`/ventas/${id}`);
    return response.data;
  },

  async registrarVenta(payload: CreateVentaPayload): Promise<VentaResponse> {
    const response = await api.post<VentaResponse>('/ventas', payload);
    return response.data;
  },
};
