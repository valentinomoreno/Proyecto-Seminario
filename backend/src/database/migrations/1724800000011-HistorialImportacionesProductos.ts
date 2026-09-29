import { MigrationInterface, QueryRunner } from 'typeorm';

export class HistorialImportacionesProductos1724800000011 implements MigrationInterface {
  name = 'HistorialImportacionesProductos1724800000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "importaciones_productos" (
        "id_importacion" SERIAL NOT NULL,
        "fecha_hora" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "nombre_archivo" character varying(255) NOT NULL,
        "usuario_nombre" character varying(60) NOT NULL,
        "id_usuario" integer,
        "total_procesados" integer NOT NULL,
        "creados" integer NOT NULL,
        "actualizados" integer NOT NULL,
        "sin_cambios" integer NOT NULL,
        "errores" integer NOT NULL,
        "detalle_errores" jsonb NOT NULL DEFAULT '[]'::jsonb,
        CONSTRAINT "CHK_importacion_productos_contadores" CHECK (
          "total_procesados" >= 0 AND "creados" >= 0 AND "actualizados" >= 0
          AND "sin_cambios" >= 0 AND "errores" >= 0
        ),
        CONSTRAINT "PK_importaciones_productos" PRIMARY KEY ("id_importacion")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "importaciones_productos"
      ADD CONSTRAINT "FK_importaciones_productos_usuario"
      FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query('CREATE INDEX "IDX_importaciones_productos_fecha" ON "importaciones_productos" ("fecha_hora" DESC)');
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_productos_sku_lower" ON "productos" (LOWER(TRIM("sku")))');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_productos_sku_lower"');
    await queryRunner.query('DROP INDEX "IDX_importaciones_productos_fecha"');
    await queryRunner.query('DROP TABLE "importaciones_productos"');
  }
}
