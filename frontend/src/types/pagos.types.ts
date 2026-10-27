export interface OrdenQr {
  id: string;
  estado: 'CREANDO' | 'PENDIENTE' | 'APROBADO' | 'CANCELADO' | 'EXPIRADO' | 'ERROR';
  qrData: string | null;
  monto: number;
  venceEn: string;
  idVenta: number | null;
  error: string | null;
  reservaActiva: boolean;
}
