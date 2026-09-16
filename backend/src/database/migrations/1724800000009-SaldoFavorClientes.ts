import { MigrationInterface, QueryRunner } from 'typeorm';

export class SaldoFavorClientes1724800000009 implements MigrationInterface {
  name = 'SaldoFavorClientes1724800000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "cuentas_corrientes" ADD "saldo_favor" numeric(14,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "cuentas_corrientes" ADD CONSTRAINT "CHK_cuenta_saldo_favor_no_negativo" CHECK ("saldo_favor" >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE "movimientos_cta_cte" ADD "saldo_favor_posterior" numeric(14,2) NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "movimientos_cta_cte" ADD CONSTRAINT "CHK_mov_cta_saldo_favor" CHECK ("saldo_favor_posterior" >= 0)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "movimientos_cta_cte" DROP CONSTRAINT "CHK_mov_cta_saldo_favor"');
    await queryRunner.query('ALTER TABLE "movimientos_cta_cte" DROP COLUMN "saldo_favor_posterior"');
    await queryRunner.query('ALTER TABLE "cuentas_corrientes" DROP CONSTRAINT "CHK_cuenta_saldo_favor_no_negativo"');
    await queryRunner.query('ALTER TABLE "cuentas_corrientes" DROP COLUMN "saldo_favor"');
  }
}
