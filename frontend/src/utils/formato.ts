export function formatearMonto(valor: number | string | null | undefined): string {
  const numero = Number(valor ?? 0);
  if (Number.isNaN(numero)) return '0,00';
  return numero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Días completos transcurridos desde `valor` hasta hoy (0 si la fecha es futura o inválida). */
export function diasTranscurridos(valor: string | null | undefined): number {
  if (!valor) return 0;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 0;
  const milisegundos = Date.now() - fecha.getTime();
  if (milisegundos <= 0) return 0;
  return Math.floor(milisegundos / (1000 * 60 * 60 * 24));
}
