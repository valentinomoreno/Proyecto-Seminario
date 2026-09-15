import { MigrationInterface, QueryRunner } from 'typeorm';

export class DescripcionProductoOpcional1724800000004 implements MigrationInterface {
  name = 'DescripcionProductoOpcional1724800000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "productos" ALTER COLUMN "descripcion" DROP NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "productos" SET "descripcion" = '' WHERE "descripcion" IS NULL`);
    await queryRunner.query(`ALTER TABLE "productos" ALTER COLUMN "descripcion" SET NOT NULL`);
  }
}
