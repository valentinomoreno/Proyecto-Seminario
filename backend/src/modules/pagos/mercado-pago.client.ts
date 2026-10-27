import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OrdenMp {
  id: string;
  status: string;
  status_detail?: string;
  total_amount: string;
  currency: string;
  external_reference: string;
  created_date?: string;
  type_response?: { qr_data?: string };
  transactions?: { payments?: Array<{ id?: string; amount: string; status: string; status_detail?: string }> };
}

export class MercadoPagoHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Mercado Pago respondió ${status}.`);
  }
}

@Injectable()
export class MercadoPagoClient {
  constructor(private readonly config: ConfigService) {}

  configured(): boolean {
    return Boolean(this.config.get<string>('MP_ACCESS_TOKEN')?.trim() && this.config.get<string>('MP_EXTERNAL_POS_ID')?.trim());
  }

  async crear(referencia: string, clave: string, monto: string): Promise<OrdenMp> {
    const caja = this.config.get<string>('MP_EXTERNAL_POS_ID');
    if (!caja) throw new ServiceUnavailableException('Falta configurar la caja de Mercado Pago.');
    return this.request('/v1/orders', 'POST', clave, {
      type: 'qr', total_amount: monto, external_reference: referencia,
      description: 'Compra en mostrador', expiration_time: 'PT15M',
      config: { qr: { external_pos_id: caja, mode: 'dynamic' } },
      transactions: { payments: [{ amount: monto }] },
    });
  }

  consultar(id: string): Promise<OrdenMp> {
    return this.request(`/v1/orders/${encodeURIComponent(id)}`, 'GET');
  }

  cancelar(id: string, clave: string): Promise<OrdenMp> {
    return this.request(`/v1/orders/${encodeURIComponent(id)}/cancel`, 'POST', clave);
  }

  private async request(path: string, method: 'GET' | 'POST', idempotencia?: string, body?: unknown): Promise<OrdenMp> {
    const token = this.config.get<string>('MP_ACCESS_TOKEN');
    if (!token) throw new ServiceUnavailableException('Falta configurar Mercado Pago.');
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new MercadoPagoHttpError(response.status);
    }
    return response.json() as Promise<OrdenMp>;
  }
}
