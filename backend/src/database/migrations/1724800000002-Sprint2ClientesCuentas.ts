import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint2ClientesCuentas1724800000002 implements MigrationInterface {
  name = 'Sprint2ClientesCuentas1724800000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."clientes_tipo_enum" AS ENUM('PERSONA', 'EMPRESA')`);
    await queryRunner.query(`CREATE TABLE "condiciones_iva" (
      "id_condicion_iva" SERIAL NOT NULL,
      "codigo" character varying(40) NOT NULL,
      "nombre" character varying(80) NOT NULL,
      CONSTRAINT "UQ_condiciones_iva_codigo" UNIQUE ("codigo"),
      CONSTRAINT "UQ_condiciones_iva_nombre" UNIQUE ("nombre"),
      CONSTRAINT "PK_condiciones_iva" PRIMARY KEY ("id_condicion_iva")
    )`);
    await queryRunner.query(`CREATE TABLE "clientes" (
      "id_cliente" SERIAL NOT NULL,
      "tipo" "public"."clientes_tipo_enum" NOT NULL,
      "telefono" character varying(40),
      "correo" character varying(160),
      "direccion" character varying(200),
      "id_condicion_iva" integer NOT NULL,
      "fecha_baja" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "PK_clientes" PRIMARY KEY ("id_cliente")
    )`);
    await queryRunner.query(`CREATE TABLE "clientes_persona" (
      "id_cliente_persona" SERIAL NOT NULL,
      "nombre" character varying(80) NOT NULL,
      "apellido" character varying(80) NOT NULL,
      "dni" character varying(8) NOT NULL,
      "cuil" character varying(11) NOT NULL,
      "id_cliente" integer NOT NULL,
      CONSTRAINT "UQ_clientes_persona_dni" UNIQUE ("dni"),
      CONSTRAINT "UQ_clientes_persona_cuil" UNIQUE ("cuil"),
      CONSTRAINT "REL_clientes_persona_cliente" UNIQUE ("id_cliente"),
      CONSTRAINT "PK_clientes_persona" PRIMARY KEY ("id_cliente_persona")
    )`);
    await queryRunner.query(`CREATE TABLE "clientes_empresa" (
      "id_cliente_empresa" SERIAL NOT NULL,
      "cuit" character varying(11) NOT NULL,
      "razon_social" character varying(160) NOT NULL,
      "persona_contacto" character varying(160) NOT NULL,
      "id_cliente" integer NOT NULL,
      CONSTRAINT "UQ_clientes_empresa_cuit" UNIQUE ("cuit"),
      CONSTRAINT "REL_clientes_empresa_cliente" UNIQUE ("id_cliente"),
      CONSTRAINT "PK_clientes_empresa" PRIMARY KEY ("id_cliente_empresa")
    )`);
    await queryRunner.query(`CREATE TABLE "cuentas_corrientes" (
      "id_cuenta_corriente" SERIAL NOT NULL,
      "numero_cuenta" character varying(20) NOT NULL,
      "saldo" numeric(14,2) NOT NULL DEFAULT 0,
      "activa" boolean NOT NULL DEFAULT true,
      "fecha_alta" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "fecha_baja" TIMESTAMP WITH TIME ZONE,
      "id_cliente" integer NOT NULL,
      CONSTRAINT "UQ_cuentas_corrientes_numero" UNIQUE ("numero_cuenta"),
      CONSTRAINT "REL_cuentas_corrientes_cliente" UNIQUE ("id_cliente"),
      CONSTRAINT "PK_cuentas_corrientes" PRIMARY KEY ("id_cuenta_corriente")
    )`);
    await queryRunner.query(`ALTER TABLE "clientes" ADD CONSTRAINT "FK_clientes_condicion_iva" FOREIGN KEY ("id_condicion_iva") REFERENCES "condiciones_iva"("id_condicion_iva") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "clientes_persona" ADD CONSTRAINT "FK_clientes_persona_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "clientes_empresa" ADD CONSTRAINT "FK_clientes_empresa_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "cuentas_corrientes" ADD CONSTRAINT "FK_cuentas_corrientes_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE INDEX "IDX_clientes_persona_apellido" ON "clientes_persona" ("apellido")`);
    await queryRunner.query(`CREATE INDEX "IDX_clientes_persona_apellido_trgm" ON "clientes_persona" USING gin ("apellido" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX "IDX_clientes_empresa_razon_social_trgm" ON "clientes_empresa" USING gin ("razon_social" gin_trgm_ops)`);
    await queryRunner.query(`CREATE SEQUENCE "cuenta_corriente_numero_seq" START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`INSERT INTO "condiciones_iva" ("codigo", "nombre") VALUES
      ('CONSUMIDOR_FINAL', 'Consumidor Final'),
      ('MONOTRIBUTO', 'Monotributo'),
      ('RESPONSABLE_INSCRIPTO', 'Responsable Inscripto')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "cuenta_corriente_numero_seq"`);
    await queryRunner.query(`DROP TABLE "cuentas_corrientes"`);
    await queryRunner.query(`DROP TABLE "clientes_empresa"`);
    await queryRunner.query(`DROP TABLE "clientes_persona"`);
    await queryRunner.query(`DROP TABLE "clientes"`);
    await queryRunner.query(`DROP TABLE "condiciones_iva"`);
    await queryRunner.query(`DROP TYPE "public"."clientes_tipo_enum"`);
  }
}
