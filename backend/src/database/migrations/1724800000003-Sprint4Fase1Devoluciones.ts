import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint4Fase1Devoluciones1724800000003 implements MigrationInterface {
  name = 'Sprint4Fase1Devoluciones1724800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "nota_credito_numero_seq" START WITH 1 INCREMENT BY 1`);

    await queryRunner.query(`CREATE TABLE "devoluciones" ("id_devolucion" SERIAL NOT NULL, "id_venta_detalle" integer NOT NULL, "cantidad_devuelta" integer NOT NULL, "motivo" character varying(255) NOT NULL, "monto_devuelto" numeric(12,2) NOT NULL, "apto_reingreso" boolean NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id_empleado_autoriza" integer NOT NULL, "observaciones" text, CONSTRAINT "CHK_devolucion_cantidad" CHECK ("cantidad_devuelta" > 0), CONSTRAINT "CHK_devolucion_monto" CHECK ("monto_devuelto" > 0), CONSTRAINT "PK_devoluciones" PRIMARY KEY ("id_devolucion"))`);
    await queryRunner.query(`CREATE INDEX "IDX_devoluciones_fecha" ON "devoluciones" ("fecha")`);
    await queryRunner.query(`ALTER TABLE "devoluciones" ADD CONSTRAINT "FK_devoluciones_venta_detalle" FOREIGN KEY ("id_venta_detalle") REFERENCES "ventas_detalle"("id_venta_detalle") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "devoluciones" ADD CONSTRAINT "FK_devoluciones_empleado_autoriza" FOREIGN KEY ("id_empleado_autoriza") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE TYPE "public"."notas_credito_estado_enum" AS ENUM('EMITIDA')`);
    await queryRunner.query(`CREATE TABLE "notas_credito" ("id_nota_credito" SERIAL NOT NULL, "id_devolucion" integer NOT NULL, "numero" character varying(20) NOT NULL, "monto" numeric(12,2) NOT NULL, "fecha_emision" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "estado" "public"."notas_credito_estado_enum" NOT NULL DEFAULT 'EMITIDA', CONSTRAINT "UQ_notas_credito_numero" UNIQUE ("numero"), CONSTRAINT "REL_notas_credito_devolucion" UNIQUE ("id_devolucion"), CONSTRAINT "CHK_nota_credito_monto" CHECK ("monto" > 0), CONSTRAINT "PK_notas_credito" PRIMARY KEY ("id_nota_credito"))`);
    await queryRunner.query(`ALTER TABLE "notas_credito" ADD CONSTRAINT "FK_notas_credito_devolucion" FOREIGN KEY ("id_devolucion") REFERENCES "devoluciones"("id_devolucion") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    // El FK quedó pendiente en la migración de Fase 0 porque la tabla devoluciones no existía todavía.
    await queryRunner.query(`ALTER TABLE "movimientos_stock" ADD CONSTRAINT "FK_movimientos_stock_devolucion" FOREIGN KEY ("id_devolucion") REFERENCES "devoluciones"("id_devolucion") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "movimientos_stock" DROP CONSTRAINT "FK_movimientos_stock_devolucion"`);
    await queryRunner.query(`DROP TABLE "notas_credito"`);
    await queryRunner.query(`DROP TYPE "public"."notas_credito_estado_enum"`);
    await queryRunner.query(`DROP TABLE "devoluciones"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "nota_credito_numero_seq"`);
  }
}
