import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint5Idempotencia1724800000013 implements MigrationInterface {
  name = 'Sprint5Idempotencia1724800000013';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE pagos_qr ADD COLUMN solicitud_hash char(64)');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE pagos_qr DROP COLUMN solicitud_hash');
  }
}
