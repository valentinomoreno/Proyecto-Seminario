import { api } from './axios.instance';

export interface MesVentas {
  mes: string;
  operaciones: number;
  bruto: number;
  devoluciones: number;
  neto: number;
  comprobantes: Record<string, number>;
  medios: Record<string, number>;
}

export interface RankingProducto {
  idProducto: number;
  sku: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  recaudacion: number;
}

export interface Periodo { desde: string; hasta: string }

export const reportesApi = {
  async ventasMensuales(periodo: Periodo) {
    const { data } = await api.get<{ periodo: Periodo; data: MesVentas[] }>('/reportes/ventas-mensuales', { params: periodo });
    return data;
  },
  async rankingProductos(periodo: Periodo, idCategoria?: number) {
    const { data } = await api.get<{ periodo: Periodo; data: RankingProducto[] }>('/reportes/ranking-productos', {
      params: { ...periodo, ...(idCategoria ? { idCategoria } : {}) },
    });
    return data;
  },
};

export function descargarCsv(nombre: string, columnas: string[], filas: Array<Array<string | number>>) {
  const escapar = (valor: string | number) => {
    const texto = String(valor);
    const seguro = typeof valor === 'string' && /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replaceAll('"', '""')}"`;
  };
  const csv = '\uFEFF' + [columnas, ...filas].map((fila) => fila.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
