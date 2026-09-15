import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint4Fase2Notificaciones1724800000007 implements MigrationInterface {
  name = 'Sprint4Fase2Notificaciones1724800000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "avisos_cobro_enviados" ("id_aviso" SERIAL NOT NULL, "id_cliente" integer NOT NULL, "fecha" date NOT NULL, CONSTRAINT "UQ_avisos_cobro_enviados_cliente_fecha" UNIQUE ("id_cliente", "fecha"), CONSTRAINT "PK_avisos_cobro_enviados" PRIMARY KEY ("id_aviso"))`);
    await queryRunner.query(`ALTER TABLE "avisos_cobro_enviados" ADD CONSTRAINT "FK_avisos_cobro_enviados_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "avisos_cobro_enviados" DROP CONSTRAINT "FK_avisos_cobro_enviados_cliente"`);
    await queryRunner.query(`DROP TABLE "avisos_cobro_enviados"`);
  }
}
