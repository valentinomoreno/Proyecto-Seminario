import type { Cliente } from '../types/cliente.types';

/**
 * Forma mínima de cliente que necesitan las pantallas de ventas, devoluciones y
 * cuentas corrientes. El backend puede embeber el cliente completo o un resumen,
 * por eso las relaciones y los datos de contacto son opcionales.
 */
export type ClienteResumen = Pick<Cliente, 'idCliente' | 'tipo'> & {
  nombreMostrar?: string | null;
  persona?: Cliente['persona'];
  empresa?: Cliente['empresa'];
  contacto?: Cliente['contacto'] | null;
};

const SIN_DATOS = 'Cliente sin datos';

function limpiar(valor: string | null | undefined): string {
  return (valor ?? '').trim();
}

/**
 * Nombre visible de un cliente, con el mismo criterio que el listado de clientes:
 * las personas se muestran como «Apellido, Nombre» y las empresas por su razón social.
 */
export function nombreCliente(cliente: ClienteResumen | null | undefined): string {
  if (!cliente) return SIN_DATOS;

  const dePersona = [limpiar(cliente.persona?.apellido), limpiar(cliente.persona?.nombre)]
    .filter((parte) => parte.length > 0)
    .join(', ');
  const deEmpresa = limpiar(cliente.empresa?.razonSocial);
  const precalculado = limpiar(cliente.nombreMostrar);

  const resuelto = cliente.tipo === 'EMPRESA'
    ? deEmpresa || dePersona
    : dePersona || deEmpresa;

  if (resuelto) return resuelto;
  if (precalculado) return precalculado;
  return cliente.idCliente ? `Cliente #${cliente.idCliente}` : SIN_DATOS;
}

/**
 * Documento identificatorio con su etiqueta: DNI (o CUIL) para personas y CUIT
 * para empresas. Devuelve `null` cuando el backend no envió las relaciones.
 */
export function documentoCliente(cliente: ClienteResumen | null | undefined): string | null {
  if (!cliente) return null;

  const cuit = limpiar(cliente.empresa?.cuit);
  if (cliente.tipo === 'EMPRESA' && cuit) return `CUIT ${cuit}`;

  const dni = limpiar(cliente.persona?.dni);
  if (dni) return `DNI ${dni}`;
  const cuil = limpiar(cliente.persona?.cuil);
  if (cuil) return `CUIL ${cuil}`;

  return cuit ? `CUIT ${cuit}` : null;
}

/** Correo de contacto del cliente (el modelo lo expone como `contacto.correo`). */
export function correoCliente(cliente: ClienteResumen | null | undefined): string | null {
  const correo = limpiar(cliente?.contacto?.correo);
  return correo || null;
}

/** Teléfono de contacto del cliente. */
export function telefonoCliente(cliente: ClienteResumen | null | undefined): string | null {
  const telefono = limpiar(cliente?.contacto?.telefono);
  return telefono || null;
}
