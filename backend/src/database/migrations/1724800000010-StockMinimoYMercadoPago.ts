import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockMinimoYMercadoPago1724800000010 implements MigrationInterface {
  name = 'StockMinimoYMercadoPago1724800000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "productos" ADD COLUMN "stock_minimo" integer NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE "productos" ADD COLUMN "punto_pedido" integer NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE "productos" ADD COLUMN "precio_costo" numeric(12,2)');
    await queryRunner.query('ALTER TABLE "productos" ADD CONSTRAINT "CHK_producto_stock_minimo" CHECK ("stock_minimo" >= 0)');
    await queryRunner.query('ALTER TABLE "productos" ADD CONSTRAINT "CHK_producto_punto_pedido" CHECK ("punto_pedido" >= "stock_minimo")');
    await queryRunner.query('ALTER TABLE "productos" ADD CONSTRAINT "CHK_producto_precio_costo" CHECK ("precio_costo" IS NULL OR "precio_costo" >= 0)');
    await queryRunner.query('CREATE INDEX "IDX_productos_alerta_stock" ON "productos" ("stock", "stock_minimo") WHERE "fecha_baja" IS NULL');
    await queryRunner.query('ALTER TYPE "public"."metodo_cobro_enum" ADD VALUE IF NOT EXISTS \'MERCADO_PAGO\'');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite quitar de forma segura un valor enum si pudiera estar en uso.
    await queryRunner.query('DROP INDEX "IDX_productos_alerta_stock"');
    await queryRunner.query('ALTER TABLE "productos" DROP CONSTRAINT "CHK_producto_precio_costo"');
    await queryRunner.query('ALTER TABLE "productos" DROP CONSTRAINT "CHK_producto_punto_pedido"');
    await queryRunner.query('ALTER TABLE "productos" DROP CONSTRAINT "CHK_producto_stock_minimo"');
    await queryRunner.query('ALTER TABLE "productos" DROP COLUMN "precio_costo"');
    await queryRunner.query('ALTER TABLE "productos" DROP COLUMN "punto_pedido"');
    await queryRunner.query('ALTER TABLE "productos" DROP COLUMN "stock_minimo"');
  }
}
