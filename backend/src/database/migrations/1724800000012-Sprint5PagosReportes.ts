import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint5PagosReportes1724800000012 implements MigrationInterface {
  name = 'Sprint5PagosReportes1724800000012';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE productos ADD COLUMN stock_reservado integer NOT NULL DEFAULT 0');
    await q.query('ALTER TABLE productos ADD CONSTRAINT CHK_producto_reservado CHECK (stock_reservado >= 0 AND stock_reservado <= stock)');
    await q.query(`CREATE TABLE pagos_qr (
      id uuid PRIMARY KEY, clave_idempotencia uuid NOT NULL UNIQUE,
      referencia varchar(64) NOT NULL UNIQUE, id_orden_mp varchar(100) UNIQUE,
      id_cliente integer NOT NULL REFERENCES clientes(id_cliente),
      id_usuario integer NOT NULL REFERENCES usuarios(id_usuario),
      id_venta integer UNIQUE REFERENCES ventas(id_venta),
      monto numeric(12,2) NOT NULL CHECK (monto > 0),
      estado varchar(24) NOT NULL CHECK (estado IN ('CREANDO','PENDIENTE','APROBADO','CANCELADO','EXPIRADO','ERROR')),
      qr_data text, creado_en timestamptz NOT NULL DEFAULT now(),
      vence_en timestamptz NOT NULL, actualizado_en timestamptz NOT NULL DEFAULT now(),
      error text
    )`);
    await q.query(`CREATE TABLE pagos_qr_items (
      id_pago uuid NOT NULL REFERENCES pagos_qr(id) ON DELETE CASCADE,
      id_producto integer NOT NULL REFERENCES productos(id_producto),
      cantidad integer NOT NULL CHECK (cantidad > 0),
      precio_unitario numeric(12,2) NOT NULL CHECK (precio_unitario > 0),
      PRIMARY KEY (id_pago, id_producto)
    )`);
    await q.query(`CREATE TABLE pagos_qr_eventos (
      id_evento varchar(100) PRIMARY KEY, id_orden_mp varchar(100) NOT NULL,
      recibido_en timestamptz NOT NULL DEFAULT now(), procesado_en timestamptz,
      intentos integer NOT NULL DEFAULT 0, ultimo_error text
    )`);
    await q.query('CREATE INDEX IDX_pagos_qr_pendientes ON pagos_qr (actualizado_en) WHERE estado IN (\'CREANDO\',\'PENDIENTE\')');
    await q.query('CREATE INDEX IDX_ventas_fecha_estado ON ventas (fecha, estado)');
    await q.query('CREATE INDEX IDX_notas_credito_fecha ON notas_credito (fecha_emision)');
    await q.query('CREATE INDEX IDX_devoluciones_detalle ON devoluciones (id_venta_detalle)');
    await q.query('CREATE INDEX IDX_productos_categoria ON productos (id_categoria)');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX IDX_productos_categoria');
    await q.query('DROP INDEX IDX_devoluciones_detalle');
    await q.query('DROP INDEX IDX_notas_credito_fecha');
    await q.query('DROP INDEX IDX_ventas_fecha_estado');
    await q.query('DROP INDEX IDX_pagos_qr_pendientes');
    await q.query('DROP TABLE pagos_qr_eventos');
    await q.query('DROP TABLE pagos_qr_items');
    await q.query('DROP TABLE pagos_qr');
    await q.query('ALTER TABLE productos DROP CONSTRAINT CHK_producto_reservado');
    await q.query('ALTER TABLE productos DROP COLUMN stock_reservado');
  }
}
