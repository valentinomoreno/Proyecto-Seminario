import { MigrationInterface, QueryRunner } from 'typeorm';

export class IntegridadRendimientoClientes1724800000003 implements MigrationInterface {
  name = 'IntegridadRendimientoClientes1724800000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "clientes_persona" ADD COLUMN "id_persona" integer`);
    await queryRunner.query(`
      INSERT INTO "personas" ("nombre", "apellido", "cuil", "dni")
      SELECT cp."nombre", cp."apellido", cp."cuil", cp."dni"
      FROM "clientes_persona" cp
      WHERE NOT EXISTS (
        SELECT 1
        FROM "personas" p
        WHERE p."dni" = cp."dni" OR p."cuil" = cp."cuil"
      )
    `);
    await queryRunner.query(`
      UPDATE "clientes_persona" cp
      SET "id_persona" = p."id_persona"
      FROM "personas" p
      WHERE p."dni" = cp."dni" AND p."cuil" = cp."cuil"
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "clientes_persona" WHERE "id_persona" IS NULL) THEN
          RAISE EXCEPTION 'Hay clientes persona cuyo DNI y CUIL pertenecen a registros de persona diferentes';
        END IF;
      END $$
    `);
    await queryRunner.query(`ALTER TABLE "clientes_persona" ALTER COLUMN "id_persona" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "clientes_persona" ADD CONSTRAINT "REL_clientes_persona_persona" UNIQUE ("id_persona")`);
    await queryRunner.query(`ALTER TABLE "clientes_persona" ADD CONSTRAINT "FK_clientes_persona_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`CREATE INDEX "IDX_clientes_persona_dni_trgm" ON "clientes_persona" USING gin ("dni" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX "IDX_clientes_persona_cuil_trgm" ON "clientes_persona" USING gin ("cuil" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX "IDX_clientes_empresa_cuit_trgm" ON "clientes_empresa" USING gin ("cuit" gin_trgm_ops)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_clientes_empresa_cuit_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clientes_persona_cuil_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clientes_persona_dni_trgm"`);
    await queryRunner.query(`ALTER TABLE "clientes_persona" DROP CONSTRAINT "FK_clientes_persona_persona"`);
    await queryRunner.query(`ALTER TABLE "clientes_persona" DROP CONSTRAINT "REL_clientes_persona_persona"`);
    await queryRunner.query(`ALTER TABLE "clientes_persona" DROP COLUMN "id_persona"`);
  }
}
