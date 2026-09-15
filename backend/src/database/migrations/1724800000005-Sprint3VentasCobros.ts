import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint3VentasCobros1724800000005 implements MigrationInterface {
  name = 'Sprint3VentasCobros1724800000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."modalidad_pago_enum" AS ENUM('CONTADO', 'CUENTA_CORRIENTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."estado_venta_enum" AS ENUM('COMPLETADA', 'CANCELADA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tipo_movimiento_stock_enum" AS ENUM('SALIDA_VENTA', 'ENTRADA_COMPRA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."metodo_cobro_enum" AS ENUM('EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tipo_factura_enum" AS ENUM('FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'REMITO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tipo_movimiento_cta_cte_enum" AS ENUM('IMPUTACION_VENTA', 'COBRO_CUENTA', 'AJUSTE')`,
    );

    await queryRunner.query(`CREATE SEQUENCE "venta_numero_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE "factura_numero_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE "remito_numero_seq" START WITH 1 INCREMENT BY 1`);

    await queryRunner.query(
      `INSERT INTO "condiciones_iva" ("codigo", "nombre") VALUES ('EXENTO', 'Exento') ON CONFLICT ("codigo") DO NOTHING`,
    );
    await queryRunner.query(
      `ALTER TABLE "cuentas_corrientes" ADD "limite_credito" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "cuentas_corrientes" ADD CONSTRAINT "CHK_cuenta_saldo_no_negativo" CHECK ("saldo" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cuentas_corrientes" ADD CONSTRAINT "CHK_cuenta_limite_no_negativo" CHECK ("limite_credito" >= 0)`,
    );

    await queryRunner.query(`CREATE TABLE "ventas" (
      "id_venta" SERIAL NOT NULL,
      "numero_venta" character varying(30) NOT NULL,
      "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "subtotal" numeric(12,2) NOT NULL,
      "iva" numeric(12,2) NOT NULL DEFAULT 0,
      "total" numeric(12,2) NOT NULL,
      "modalidad_pago" "public"."modalidad_pago_enum" NOT NULL,
      "estado" "public"."estado_venta_enum" NOT NULL DEFAULT 'COMPLETADA',
      "id_usuario" integer NOT NULL,
      "id_cliente" integer NOT NULL,
      CONSTRAINT "UQ_ventas_numero" UNIQUE ("numero_venta"),
      CONSTRAINT "CHK_venta_importes" CHECK ("subtotal" >= 0 AND "iva" >= 0 AND "total" > 0 AND "subtotal" + "iva" = "total"),
      CONSTRAINT "PK_ventas" PRIMARY KEY ("id_venta"),
      CONSTRAINT "FK_ventas_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_ventas_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "detalles_venta" (
      "id_detalle_venta" SERIAL NOT NULL,
      "id_venta" integer NOT NULL,
      "id_producto" integer NOT NULL,
      "cantidad" integer NOT NULL,
      "precio_unitario" numeric(12,2) NOT NULL,
      "subtotal" numeric(12,2) NOT NULL,
      CONSTRAINT "UQ_detalle_venta_producto" UNIQUE ("id_venta", "id_producto"),
      CONSTRAINT "CHK_detalle_cantidad" CHECK ("cantidad" > 0),
      CONSTRAINT "CHK_detalle_precio" CHECK ("precio_unitario" > 0),
      CONSTRAINT "CHK_detalle_subtotal" CHECK ("subtotal" > 0),
      CONSTRAINT "PK_detalles_venta" PRIMARY KEY ("id_detalle_venta"),
      CONSTRAINT "FK_detalles_venta_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE NO ACTION,
      CONSTRAINT "FK_detalles_venta_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "movimientos_stock" (
      "id_movimiento_stock" SERIAL NOT NULL,
      "id_producto" integer NOT NULL,
      "id_usuario" integer NOT NULL,
      "id_venta" integer,
      "tipo" "public"."tipo_movimiento_stock_enum" NOT NULL,
      "cantidad" integer NOT NULL,
      "stock_anterior" integer NOT NULL,
      "stock_posterior" integer NOT NULL,
      "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "motivo" character varying(200) NOT NULL,
      CONSTRAINT "CHK_movimiento_stock_cantidad" CHECK ("cantidad" > 0),
      CONSTRAINT "CHK_movimiento_stock_saldos" CHECK ("stock_anterior" >= 0 AND "stock_posterior" >= 0),
      CONSTRAINT "PK_movimientos_stock" PRIMARY KEY ("id_movimiento_stock"),
      CONSTRAINT "FK_mov_stock_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_mov_stock_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_mov_stock_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE SET NULL ON UPDATE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "cobros" (
      "id_cobro" SERIAL NOT NULL,
      "id_venta" integer NOT NULL,
      "metodo_cobro" "public"."metodo_cobro_enum" NOT NULL,
      "monto" numeric(12,2) NOT NULL,
      "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "referencia" character varying(100),
      CONSTRAINT "UQ_cobros_venta" UNIQUE ("id_venta"),
      CONSTRAINT "CHK_cobro_monto" CHECK ("monto" > 0),
      CONSTRAINT "PK_cobros" PRIMARY KEY ("id_cobro"),
      CONSTRAINT "FK_cobros_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "facturas" (
      "id_factura" SERIAL NOT NULL,
      "id_venta" integer NOT NULL,
      "tipo_factura" "public"."tipo_factura_enum" NOT NULL,
      "numero_factura" character varying(30) NOT NULL,
      "fecha_emision" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "subtotal" numeric(12,2) NOT NULL,
      "iva" numeric(12,2) NOT NULL DEFAULT 0,
      "total" numeric(12,2) NOT NULL,
      "cae" character varying(30),
      "fecha_vencimiento_cae" date,
      CONSTRAINT "UQ_facturas_venta" UNIQUE ("id_venta"),
      CONSTRAINT "UQ_facturas_numero" UNIQUE ("numero_factura"),
      CONSTRAINT "CHK_factura_importes" CHECK ("subtotal" >= 0 AND "iva" >= 0 AND "total" > 0 AND "subtotal" + "iva" = "total"),
      CONSTRAINT "PK_facturas" PRIMARY KEY ("id_factura"),
      CONSTRAINT "FK_facturas_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE NO ACTION
    )`);

    await queryRunner.query(`CREATE TABLE "movimientos_cta_cte" (
      "id_movimiento_cta_cte" SERIAL NOT NULL,
      "id_cuenta_corriente" integer NOT NULL,
      "id_venta" integer,
      "tipo" "public"."tipo_movimiento_cta_cte_enum" NOT NULL,
      "monto" numeric(14,2) NOT NULL,
      "saldo_posterior" numeric(14,2) NOT NULL,
      "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "descripcion" character varying(200),
      CONSTRAINT "CHK_mov_cta_monto" CHECK ("monto" > 0),
      CONSTRAINT "CHK_mov_cta_saldo" CHECK ("saldo_posterior" >= 0),
      CONSTRAINT "PK_movimientos_cta_cte" PRIMARY KEY ("id_movimiento_cta_cte"),
      CONSTRAINT "FK_mov_cta_cuenta" FOREIGN KEY ("id_cuenta_corriente") REFERENCES "cuentas_corrientes"("id_cuenta_corriente") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_mov_cta_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE SET NULL ON UPDATE NO ACTION
    )`);

    await queryRunner.query(`CREATE INDEX "IDX_ventas_fecha" ON "ventas" ("fecha")`);
    await queryRunner.query(`CREATE INDEX "IDX_ventas_cliente" ON "ventas" ("id_cliente")`);
    await queryRunner.query(`CREATE INDEX "IDX_detalles_producto" ON "detalles_venta" ("id_producto")`);
    await queryRunner.query(`CREATE INDEX "IDX_mov_stock_producto_fecha" ON "movimientos_stock" ("id_producto", "fecha")`);
    await queryRunner.query(`CREATE INDEX "IDX_mov_cta_cuenta_fecha" ON "movimientos_cta_cte" ("id_cuenta_corriente", "fecha")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_mov_cta_cuenta_fecha"`);
    await queryRunner.query(`DROP INDEX "IDX_mov_stock_producto_fecha"`);
    await queryRunner.query(`DROP INDEX "IDX_detalles_producto"`);
    await queryRunner.query(`DROP INDEX "IDX_ventas_cliente"`);
    await queryRunner.query(`DROP INDEX "IDX_ventas_fecha"`);
    await queryRunner.query(`DROP TABLE "movimientos_cta_cte"`);
    await queryRunner.query(`DROP TABLE "facturas"`);
    await queryRunner.query(`DROP TABLE "cobros"`);
    await queryRunner.query(`DROP TABLE "movimientos_stock"`);
    await queryRunner.query(`DROP TABLE "detalles_venta"`);
    await queryRunner.query(`DROP TABLE "ventas"`);
    await queryRunner.query(`ALTER TABLE "cuentas_corrientes" DROP CONSTRAINT "CHK_cuenta_limite_no_negativo"`);
    await queryRunner.query(`ALTER TABLE "cuentas_corrientes" DROP CONSTRAINT "CHK_cuenta_saldo_no_negativo"`);
    await queryRunner.query(`ALTER TABLE "cuentas_corrientes" DROP COLUMN "limite_credito"`);
    await queryRunner.query(`DELETE FROM "condiciones_iva" WHERE "codigo" = 'EXENTO'`);
    await queryRunner.query(`DROP SEQUENCE "remito_numero_seq"`);
    await queryRunner.query(`DROP SEQUENCE "factura_numero_seq"`);
    await queryRunner.query(`DROP SEQUENCE "venta_numero_seq"`);
    await queryRunner.query(`DROP TYPE "public"."tipo_movimiento_cta_cte_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tipo_factura_enum"`);
    await queryRunner.query(`DROP TYPE "public"."metodo_cobro_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tipo_movimiento_stock_enum"`);
    await queryRunner.query(`DROP TYPE "public"."estado_venta_enum"`);
    await queryRunner.query(`DROP TYPE "public"."modalidad_pago_enum"`);
  }
}
