import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request = require('supertest');

/** Completa el dígito verificador de un CUIT/CUIL a partir de sus primeros diez dígitos. */
export function crearIdentificadorFiscal(primerosDiez: string): string {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, indice) => total + Number(primerosDiez[indice]) * peso, 0);
  const resto = 11 - (suma % 11);
  const digito = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return `${primerosDiez}${digito}`;
}

/**
 * Da de alta un cliente persona y su cuenta corriente, resolviendo la condición de IVA.
 * `sufijo` debe ser de 8 dígitos para que el DNI y el CUIL sean únicos entre corridas.
 */
export async function crearClientePersona(
  app: INestApplication,
  token: string,
  sufijo: string,
  apellido = 'Prueba',
): Promise<number> {
  const condiciones = await request(app.getHttpServer())
    .get('/condiciones-iva')
    .auth(token, { type: 'bearer' })
    .expect(200);
  const condicionIvaId = (condiciones.body as Array<{ idCondicionIva: number; codigo: string }>)
    .find((item) => item.codigo === 'CONSUMIDOR_FINAL')?.idCondicionIva;

  const { body } = await request(app.getHttpServer())
    .post('/clientes/persona')
    .auth(token, { type: 'bearer' })
    .send({
      nombre: 'Cliente',
      apellido,
      dni: sufijo,
      cuil: crearIdentificadorFiscal(`20${sufijo}`),
      correo: `cliente.${sufijo}@example.com`,
      telefono: '3810000000',
      condicionIvaId,
    })
    .expect(201);

  const idCliente = body.idCliente as number;

  // La cuenta corriente no se crea sola: el alta es explícita.
  await request(app.getHttpServer())
    .post('/cuentas-corrientes')
    .auth(token, { type: 'bearer' })
    .send({ clienteId: idCliente })
    .expect(201);

  return idCliente;
}

/** Borra el cliente y todo lo que cuelga de él, en el orden que respetan las claves foráneas. */
export async function limpiarCliente(dataSource: DataSource, idCliente: number): Promise<void> {
  await dataSource.query('DELETE FROM avisos_cobro_enviados WHERE id_cliente = $1', [idCliente]);
  await dataSource.query(
    'DELETE FROM movimientos_cta_cte WHERE id_cuenta_corriente IN (SELECT id_cuenta_corriente FROM cuentas_corrientes WHERE id_cliente = $1)',
    [idCliente],
  );
  await dataSource.query('DELETE FROM cuentas_corrientes WHERE id_cliente = $1', [idCliente]);
  await dataSource.query('DELETE FROM clientes_persona WHERE id_cliente = $1', [idCliente]);
  await dataSource.query('DELETE FROM clientes_empresa WHERE id_cliente = $1', [idCliente]);
  await dataSource.query('DELETE FROM clientes WHERE id_cliente = $1', [idCliente]);
}
