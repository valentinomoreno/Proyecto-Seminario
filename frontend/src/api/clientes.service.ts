import { api } from './axios.instance';
import type { Cliente, CreateClientePayload } from '../types/cliente.types';

export const clientesApi = {
  async getClientes(buscar?: string, limit = 50): Promise<{ data: Cliente[] }> {
    const params: Record<string, string | number> = { limit };
    if (buscar) params.buscar = buscar;
    const response = await api.get<{ data: Cliente[] }>('/clientes', { params });
    return response.data;
  },

  async getCliente(id: number): Promise<Cliente> {
    const response = await api.get<Cliente>(`/clientes/${id}`);
    return response.data;
  },

  async createCliente(payload: CreateClientePayload): Promise<Cliente> {
    const response = await api.post<Cliente>('/clientes', payload);
    return response.data;
  },
};
