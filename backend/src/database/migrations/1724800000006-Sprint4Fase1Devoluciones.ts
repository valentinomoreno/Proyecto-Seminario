import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Devoluciones (CU-03): adapta el esquema oficial de Ventas/Cobros (migración 5)
 * agregando lo que ese circuito no necesitaba por sí solo — trazabilidad de
 * cuánto se devolvió de cada línea, el reingreso a stock y la nota de crédito.
 */
export class Sprint4Fase1Devoluciones1724800000006 implements MigrationInterface {
  name = 'Sprint4Fase1Devoluciones1724800000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "detalles_venta" ADD COLUMN "cantidad_devuelta" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "detalles_venta" ADD CONSTRAINT "CHK_detalle_venta_devuelta" CHECK ("cantidad_devuelta" >= 0 AND "cantidad_devuelta" <= "cantidad")`);

    await queryRunner.query(`ALTER TABLE "movimientos_stock" ADD COLUMN "id_devolucion" integer`);
    await queryRunner.query(`ALTER TYPE "public"."tipo_movimiento_stock_enum" ADD VALUE 'ENTRADA_DEVOLUCION'`);
    await queryRunner.query(`ALTER TYPE "public"."tipo_movimiento_cta_cte_enum" ADD VALUE 'NOTA_CREDITO'`);
    await queryRunner.query(`ALTER TYPE "public"."tipo_movimiento_cta_cte_enum" ADD VALUE 'MORA'`);

    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "nota_credito_numero_seq" START WITH 1 INCREMENT BY 1`);

    await queryRunner.query(`CREATE TABLE "devoluciones" ("id_devolucion" SERIAL NOT NULL, "id_venta_detalle" integer NOT NULL, "cantidad_devuelta" integer NOT NULL, "motivo" character varying(255) NOT NULL, "monto_devuelto" numeric(12,2) NOT NULL, "apto_reingreso" boolean NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id_empleado_autoriza" integer NOT NULL, "observaciones" text, CONSTRAINT "CHK_devolucion_cantidad" CHECK ("cantidad_devuelta" > 0), CONSTRAINT "CHK_devolucion_monto" CHECK ("monto_devuelto" > 0), CONSTRAINT "PK_devoluciones" PRIMARY KEY ("id_devolucion"))`);
    await queryRunner.query(`CREATE INDEX "IDX_devoluciones_fecha" ON "devoluciones" ("fecha")`);
    await queryRunner.query(`ALTER TABLE "devoluciones" ADD CONSTRAINT "FK_devoluciones_venta_detalle" FOREIGN KEY ("id_venta_detalle") REFERENCES "detalles_venta"("id_detalle_venta") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "devoluciones" ADD CONSTRAINT "FK_devoluciones_empleado_autoriza" FOREIGN KEY ("id_empleado_autoriza") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."notas_credito_estado_enum" AS ENUM('EMITIDA')`);
    await queryRunner.query(`CREATE TABLE "notas_credito" ("id_nota_credito" SERIAL NOT NULL, "id_devolucion" integer NOT NULL, "numero" character varying(20) NOT NULL, "monto" numeric(12,2) NOT NULL, "fecha_emision" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "estado" "public"."notas_credito_estado_enum" NOT NULL DEFAULT 'EMITIDA', CONSTRAINT "UQ_notas_credito_numero" UNIQUE ("numero"), CONSTRAINT "REL_notas_credito_devolucion" UNIQUE ("id_devolucion"), CONSTRAINT "CHK_nota_credito_monto" CHECK ("monto" > 0), CONSTRAINT "PK_notas_credito" PRIMARY KEY ("id_nota_credito"))`);
    await queryRunner.query(`ALTER TABLE "notas_credito" ADD CONSTRAINT "FK_notas_credito_devolucion" FOREIGN KEY ("id_devolucion") REFERENCES "devoluciones"("id_devolucion") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    // El FK quedó pendiente porque la tabla devoluciones no existía hasta ahora.
    await queryRunner.query(`ALTER TABLE "movimientos_stock" ADD CONSTRAINT "FK_movimientos_stock_devolucion" FOREIGN KEY ("id_devolucion") REFERENCES "devoluciones"("id_devolucion") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "movimientos_stock" DROP CONSTRAINT "FK_movimientos_stock_devolucion"`);
    await queryRunner.query(`DROP TABLE "notas_credito"`);
    await queryRunner.query(`DROP TYPE "public"."notas_credito_estado_enum"`);
    await queryRunner.query(`DROP TABLE "devoluciones"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "nota_credito_numero_seq"`);
    // Postgres no permite quitar un valor de un enum: NOTA_CREDITO/MORA/ENTRADA_DEVOLUCION
    // quedan declarados pero sin uso, inofensivo (mismo patrón que el resto del proyecto).
    await queryRunner.query(`ALTER TABLE "movimientos_stock" DROP COLUMN "id_devolucion"`);
    await queryRunner.query(`ALTER TABLE "detalles_venta" DROP CONSTRAINT "CHK_detalle_venta_devuelta"`);
    await queryRunner.query(`ALTER TABLE "detalles_venta" DROP COLUMN "cantidad_devuelta"`);
  }
}
