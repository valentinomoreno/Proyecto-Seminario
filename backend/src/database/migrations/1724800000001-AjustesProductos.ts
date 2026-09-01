import { MigrationInterface, QueryRunner } from 'typeorm';

export class AjustesProductos1724800000001 implements MigrationInterface {
  name = 'AjustesProductos1724800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE IF NOT EXISTS "producto_codigo_seq" START WITH 1 INCREMENT BY 1');
    await queryRunner.query('ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "imagen_url" character varying(255)');
    await queryRunner.query('ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "CHK_producto_costo"');
    await queryRunner.query('ALTER TABLE "productos" DROP COLUMN IF EXISTS "costo"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "productos" ADD COLUMN "costo" numeric(12,2)');
    await queryRunner.query('ALTER TABLE "productos" ADD CONSTRAINT "CHK_producto_costo" CHECK ("costo" IS NULL OR "costo" >= 0)');
    await queryRunner.query('ALTER TABLE "productos" DROP COLUMN IF EXISTS "imagen_url"');
    await queryRunner.query('DROP SEQUENCE IF EXISTS "producto_codigo_seq"');
  }
}
