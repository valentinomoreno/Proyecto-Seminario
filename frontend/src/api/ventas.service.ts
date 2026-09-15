import { api } from './axios.instance';
import type { CreateVentaPayload, VentaResponse } from '../types/venta.types';
import type { PaginatedResponse } from '../types/producto.types';

export const ventasApi = {
  async getVentas(buscar?: string, page = 1, limit = 20): Promise<PaginatedResponse<VentaResponse>> {
    const params: Record<string, string | number> = { page, limit };
    if (buscar) params.buscar = buscar;
    const response = await api.get<PaginatedResponse<VentaResponse>>('/ventas', { params });
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
