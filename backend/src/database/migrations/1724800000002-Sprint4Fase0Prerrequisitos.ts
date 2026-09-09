import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint4Fase0Prerrequisitos1724800000002 implements MigrationInterface {
  name = 'Sprint4Fase0Prerrequisitos1724800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "venta_comprobante_seq" START WITH 1 INCREMENT BY 1`);

    await queryRunner.query(`CREATE TABLE "clientes" ("id_cliente" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, "apellido" character varying(80) NOT NULL, "dni_cuit" character varying(11) NOT NULL, "email" character varying(120) NOT NULL, "telefono" character varying(30), "activo" boolean NOT NULL DEFAULT true, "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_clientes_dni_cuit" UNIQUE ("dni_cuit"), CONSTRAINT "UQ_clientes_email" UNIQUE ("email"), CONSTRAINT "PK_clientes" PRIMARY KEY ("id_cliente"))`);
    await queryRunner.query(`CREATE INDEX "IDX_clientes_nombre" ON "clientes" ("nombre")`);

    await queryRunner.query(`CREATE TABLE "cuentas_corrientes" ("id_cuenta_corriente" SERIAL NOT NULL, "id_cliente" integer NOT NULL, "saldo" numeric(12,2) NOT NULL DEFAULT 0, "fecha_ultimo_movimiento" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_cuentas_corrientes_cliente" UNIQUE ("id_cliente"), CONSTRAINT "PK_cuentas_corrientes" PRIMARY KEY ("id_cuenta_corriente"))`);
    await queryRunner.query(`ALTER TABLE "cuentas_corrientes" ADD CONSTRAINT "FK_cuentas_corrientes_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."movimientos_cta_cte_tipo_enum" AS ENUM('IMPUTACION_VENTA', 'PAGO', 'MORA', 'NOTA_CREDITO')`);
    await queryRunner.query(`CREATE TABLE "movimientos_cta_cte" ("id_movimiento_cta_cte" SERIAL NOT NULL, "id_cuenta_corriente" integer NOT NULL, "tipo" "public"."movimientos_cta_cte_tipo_enum" NOT NULL, "monto" numeric(12,2) NOT NULL, "saldo_resultante" numeric(12,2) NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id_venta" integer, "id_empleado" integer, "observaciones" character varying(255), CONSTRAINT "CHK_movimiento_cta_cte_monto" CHECK ("monto" <> 0), CONSTRAINT "PK_movimientos_cta_cte" PRIMARY KEY ("id_movimiento_cta_cte"))`);
    await queryRunner.query(`CREATE INDEX "IDX_movimientos_cta_cte_tipo" ON "movimientos_cta_cte" ("tipo")`);
    await queryRunner.query(`CREATE INDEX "IDX_movimientos_cta_cte_fecha" ON "movimientos_cta_cte" ("fecha")`);
    await queryRunner.query(`ALTER TABLE "movimientos_cta_cte" ADD CONSTRAINT "FK_movimientos_cta_cte_cuenta" FOREIGN KEY ("id_cuenta_corriente") REFERENCES "cuentas_corrientes"("id_cuenta_corriente") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "movimientos_cta_cte" ADD CONSTRAINT "FK_movimientos_cta_cte_empleado" FOREIGN KEY ("id_empleado") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."movimientos_stock_tipo_enum" AS ENUM('VENTA', 'DEVOLUCION')`);
    await queryRunner.query(`CREATE TABLE "movimientos_stock" ("id_movimiento_stock" SERIAL NOT NULL, "id_producto" integer NOT NULL, "tipo" "public"."movimientos_stock_tipo_enum" NOT NULL, "cantidad" integer NOT NULL, "stock_resultante" integer NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id_venta" integer, "id_devolucion" integer, "id_empleado" integer, "observaciones" text, CONSTRAINT "CHK_movimiento_stock_cantidad" CHECK ("cantidad" > 0), CONSTRAINT "PK_movimientos_stock" PRIMARY KEY ("id_movimiento_stock"))`);
    await queryRunner.query(`CREATE INDEX "IDX_movimientos_stock_tipo" ON "movimientos_stock" ("tipo")`);
    await queryRunner.query(`CREATE INDEX "IDX_movimientos_stock_fecha" ON "movimientos_stock" ("fecha")`);
    await queryRunner.query(`ALTER TABLE "movimientos_stock" ADD CONSTRAINT "FK_movimientos_stock_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "movimientos_stock" ADD CONSTRAINT "FK_movimientos_stock_empleado" FOREIGN KEY ("id_empleado") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."ventas_estado_enum" AS ENUM('CONFIRMADA')`);
    await queryRunner.query(`CREATE TABLE "ventas" ("id_venta" SERIAL NOT NULL, "numero_comprobante" character varying(20) NOT NULL, "id_cliente" integer NOT NULL, "id_empleado" integer NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "total" numeric(12,2) NOT NULL, "estado" "public"."ventas_estado_enum" NOT NULL DEFAULT 'CONFIRMADA', CONSTRAINT "UQ_ventas_numero_comprobante" UNIQUE ("numero_comprobante"), CONSTRAINT "CHK_venta_total" CHECK ("total" > 0), CONSTRAINT "PK_ventas" PRIMARY KEY ("id_venta"))`);
    await queryRunner.query(`CREATE INDEX "IDX_ventas_fecha" ON "ventas" ("fecha")`);
    await queryRunner.query(`ALTER TABLE "ventas" ADD CONSTRAINT "FK_ventas_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "ventas" ADD CONSTRAINT "FK_ventas_empleado" FOREIGN KEY ("id_empleado") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TABLE "ventas_detalle" ("id_venta_detalle" SERIAL NOT NULL, "id_venta" integer NOT NULL, "id_producto" integer NOT NULL, "cantidad" integer NOT NULL, "precio_unitario" numeric(12,2) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "cantidad_devuelta" integer NOT NULL DEFAULT 0, CONSTRAINT "CHK_venta_detalle_cantidad" CHECK ("cantidad" > 0), CONSTRAINT "CHK_venta_detalle_devuelta" CHECK ("cantidad_devuelta" >= 0 AND "cantidad_devuelta" <= "cantidad"), CONSTRAINT "PK_ventas_detalle" PRIMARY KEY ("id_venta_detalle"))`);
    await queryRunner.query(`ALTER TABLE "ventas_detalle" ADD CONSTRAINT "FK_ventas_detalle_venta" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "ventas_detalle" ADD CONSTRAINT "FK_ventas_detalle_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ventas_detalle"`);
    await queryRunner.query(`DROP TABLE "ventas"`);
    await queryRunner.query(`DROP TYPE "public"."ventas_estado_enum"`);
    await queryRunner.query(`DROP TABLE "movimientos_stock"`);
    await queryRunner.query(`DROP TYPE "public"."movimientos_stock_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "movimientos_cta_cte"`);
    await queryRunner.query(`DROP TYPE "public"."movimientos_cta_cte_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "cuentas_corrientes"`);
    await queryRunner.query(`DROP TABLE "clientes"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "venta_comprobante_seq"`);
  }
}
