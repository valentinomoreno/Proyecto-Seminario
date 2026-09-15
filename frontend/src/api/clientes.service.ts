import { api } from './axios.instance';
import type { Cliente, CreateClientePersonaPayload } from '../types/cliente.types';

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

  async createClientePersona(payload: CreateClientePersonaPayload): Promise<Cliente> {
    const response = await api.post<Cliente>('/clientes/persona', payload);
    return response.data;
  },
};
