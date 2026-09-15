import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint3VentasCobros1724800000002 implements MigrationInterface {
  name = 'Sprint3VentasCobros1724800000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ENUMs
    await queryRunner.query(
      `CREATE TYPE "public"."condicion_iva_enum" AS ENUM('RESPONSABLE_INSCRIPTO', 'CONSUMIDOR_FINAL', 'MONOTRIBUTO', 'EXENTO')`,
    );
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

    // 2. Sequences for sequential invoice & receipt numbers
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "venta_numero_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "factura_a_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "factura_b_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "factura_c_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "remito_numero_seq" START WITH 1 INCREMENT BY 1`);

    // 3. Clientes & Cuentas Corrientes
    await queryRunner.query(`
      CREATE TABLE "clientes" (
        "id_cliente" SERIAL NOT NULL,
        "condicion_iva" "public"."condicion_iva_enum" NOT NULL,
        "cuenta_corriente_habilitada" boolean NOT NULL DEFAULT false,
        "limite_credito" numeric(12,2) NOT NULL DEFAULT 0,
        "id_persona" integer NOT NULL,
        "fecha_baja" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_clientes_persona" UNIQUE ("id_persona"),
        CONSTRAINT "PK_clientes" PRIMARY KEY ("id_cliente"),
        CONSTRAINT "FK_clientes_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cuentas_corrientes" (
        "id_cuenta_corriente" SERIAL NOT NULL,
        "id_cliente" integer NOT NULL,
        "saldo" numeric(12,2) NOT NULL DEFAULT 0,
        "limite_credito" numeric(12,2) NOT NULL DEFAULT 0,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_cuentas_corrientes_cliente" UNIQUE ("id_cliente"),
        CONSTRAINT "PK_cuentas_corrientes" PRIMARY KEY ("id_cuenta_corriente"),
        CONSTRAINT "FK_cuentas_corrientes_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // 4. Ventas
    await queryRunner.query(`
      CREATE TABLE "ventas" (
        "id_venta" SERIAL NOT NULL,
        "numero_venta" character varying(30) NOT NULL,
        "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "subtotal" numeric(12,2) NOT NULL,
        "iva" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL,
        "modalidad_pago" "public"."modalidad_pago_enum" NOT NULL,
        "estado" "public"."estado_venta_enum" NOT NULL DEFAULT 'COMPLETADA',
        "id_usuario" integer NOT NULL,
        "id_cliente" integer NOT NULL,
        CONSTRAINT "UQ_ventas_numero" UNIQUE ("numero_venta"),
        CONSTRAINT "PK_ventas" PRIMARY KEY ("id_venta"),
        CONSTRAINT "FK_ventas_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_ventas_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // 5. Detalles Venta
    await queryRunner.query(`
      CREATE TABLE "detalles_venta" (
        "id_detalle_venta" SERIAL NOT NULL,
        "id_venta" integer NOT NULL,
        "id_producto" integer NOT NULL,
        "cantidad" integer NOT NULL,
        "precio_unitario" numeric(12,2) NOT NULL,
        "subtotal" numeric(12,2) NOT NULL,
        CONSTRAINT "CHK_detalle_cantidad" CHECK ("cantidad" > 0),
        CONSTRAINT "CHK_detalle_precio" CHECK ("precio_unitario" > 0),
        CONSTRAINT "CHK_detalle_subtotal" CHECK ("subtotal" > 0),
        CONSTRAINT "PK_detalles_venta" PRIMARY KEY ("id_detalle_venta"),
        CONSTRAINT "FK_detalles_venta_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_detalles_venta_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // 6. Kardex / Movimiento de Stock
    await queryRunner.query(`
      CREATE TABLE "movimientos_stock" (
        "id_movimiento_stock" SERIAL NOT NULL,
        "id_producto" integer NOT NULL,
        "id_usuario" integer NOT NULL,
        "id_venta" integer,
        "tipo" "public"."tipo_movimiento_stock_enum" NOT NULL,
        "cantidad" integer NOT NULL,
        "stock_anterior" integer NOT NULL,
        "stock_posterior" integer NOT NULL,
        "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "motivo" character varying(200) NOT NULL,
        CONSTRAINT "PK_movimientos_stock" PRIMARY KEY ("id_movimiento_stock"),
        CONSTRAINT "FK_movimientos_stock_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_movimientos_stock_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_movimientos_stock_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // 7. Cobros
    await queryRunner.query(`
      CREATE TABLE "cobros" (
        "id_cobro" SERIAL NOT NULL,
        "id_venta" integer NOT NULL,
        "metodo_cobro" "public"."metodo_cobro_enum" NOT NULL,
        "monto" numeric(12,2) NOT NULL,
        "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "referencia" character varying(100),
        CONSTRAINT "UQ_cobros_venta" UNIQUE ("id_venta"),
        CONSTRAINT "CHK_cobro_monto" CHECK ("monto" > 0),
        CONSTRAINT "PK_cobros" PRIMARY KEY ("id_cobro"),
        CONSTRAINT "FK_cobros_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 8. Facturas y Comprobantes
    await queryRunner.query(`
      CREATE TABLE "facturas" (
        "id_factura" SERIAL NOT NULL,
        "id_venta" integer NOT NULL,
        "tipo_factura" "public"."tipo_factura_enum" NOT NULL,
        "numero_factura" character varying(30) NOT NULL,
        "fecha_emision" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "subtotal" numeric(12,2) NOT NULL,
        "iva" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL,
        "cae" character varying(30),
        "fecha_vencimiento_cae" DATE,
        CONSTRAINT "UQ_facturas_venta" UNIQUE ("id_venta"),
        CONSTRAINT "UQ_facturas_numero" UNIQUE ("numero_factura"),
        CONSTRAINT "PK_facturas" PRIMARY KEY ("id_factura"),
        CONSTRAINT "FK_facturas_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 9. Movimientos Cuenta Corriente
    await queryRunner.query(`
      CREATE TABLE "movimientos_cta_cte" (
        "id_movimiento_cta_cte" SERIAL NOT NULL,
        "id_cuenta_corriente" integer NOT NULL,
        "id_venta" integer,
        "tipo" "public"."tipo_movimiento_cta_cte_enum" NOT NULL,
        "monto" numeric(12,2) NOT NULL,
        "saldo_posterior" numeric(12,2) NOT NULL,
        "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "descripcion" character varying(200) NOT NULL,
        CONSTRAINT "PK_movimientos_cta_cte" PRIMARY KEY ("id_movimiento_cta_cte"),
        CONSTRAINT "FK_movimientos_cta_cte_cuenta" FOREIGN KEY ("id_cuenta_corriente") REFERENCES "cuentas_corrientes"("id_cuenta_corriente") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_movimientos_cta_cte_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_cta_cte"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "facturas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cobros"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_stock"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "detalles_venta"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ventas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cuentas_corrientes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clientes"`);

    await queryRunner.query(`DROP SEQUENCE IF EXISTS "remito_numero_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "factura_c_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "factura_b_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "factura_a_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "venta_numero_seq"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tipo_movimiento_cta_cte_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tipo_factura_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."metodo_cobro_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tipo_movimiento_stock_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."estado_venta_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."modalidad_pago_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."condicion_iva_enum"`);
  }
}
