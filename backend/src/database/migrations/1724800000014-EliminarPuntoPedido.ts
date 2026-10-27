import { MigrationInterface, QueryRunner } from 'typeorm';

export class EliminarPuntoPedido1724800000014 implements MigrationInterface {
  name = 'EliminarPuntoPedido1724800000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "productos" DROP CONSTRAINT "CHK_producto_punto_pedido"');
    await queryRunner.query('ALTER TABLE "productos" DROP COLUMN "punto_pedido"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "productos" ADD COLUMN "punto_pedido" integer NOT NULL DEFAULT 0');
    await queryRunner.query('UPDATE "productos" SET "punto_pedido" = "stock_minimo"');
    await queryRunner.query('ALTER TABLE "productos" ADD CONSTRAINT "CHK_producto_punto_pedido" CHECK ("punto_pedido" >= "stock_minimo")');
  }
}
