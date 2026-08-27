import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint1Inicial1724800000000 implements MigrationInterface {
  name = 'Sprint1Inicial1724800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."roles_nombre_enum" AS ENUM('ADMINISTRADOR', 'EMPLEADO_VENTA')`);
    await queryRunner.query(`CREATE TABLE "roles" ("id_rol" SERIAL NOT NULL, "nombre" "public"."roles_nombre_enum" NOT NULL, "descripcion" character varying(160), CONSTRAINT "UQ_roles_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_roles" PRIMARY KEY ("id_rol"))`);
    await queryRunner.query(`CREATE TABLE "personas" ("id_persona" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, "apellido" character varying(80) NOT NULL, "cuil" character varying(11) NOT NULL, "dni" character varying(8) NOT NULL, CONSTRAINT "UQ_personas_cuil" UNIQUE ("cuil"), CONSTRAINT "UQ_personas_dni" UNIQUE ("dni"), CONSTRAINT "PK_personas" PRIMARY KEY ("id_persona"))`);
    await queryRunner.query(`CREATE TABLE "empleados" ("id_empleado" SERIAL NOT NULL, "legajo" character varying(30) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "id_persona" integer NOT NULL, CONSTRAINT "UQ_empleados_legajo" UNIQUE ("legajo"), CONSTRAINT "REL_empleados_persona" UNIQUE ("id_persona"), CONSTRAINT "PK_empleados" PRIMARY KEY ("id_empleado"))`);
    await queryRunner.query(`CREATE TABLE "usuarios" ("id_usuario" SERIAL NOT NULL, "nombre" character varying(60) NOT NULL, "contrasena_hash" character varying(100) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "id_rol" integer NOT NULL, "id_empleado" integer, CONSTRAINT "UQ_usuarios_nombre" UNIQUE ("nombre"), CONSTRAINT "REL_usuarios_empleado" UNIQUE ("id_empleado"), CONSTRAINT "PK_usuarios" PRIMARY KEY ("id_usuario"))`);
    await queryRunner.query(`CREATE TABLE "categorias" ("id_categoria" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, "descripcion" character varying(240), "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_categorias_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_categorias" PRIMARY KEY ("id_categoria"))`);
    await queryRunner.query(`CREATE TABLE "marcas" ("id_marca" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_marcas_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_marcas" PRIMARY KEY ("id_marca"))`);
    await queryRunner.query(`CREATE TABLE "depositos" ("id_deposito" SERIAL NOT NULL, "nombre" character varying(80) NOT NULL, "direccion" character varying(180), "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_depositos_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_depositos" PRIMARY KEY ("id_deposito"))`);
    await queryRunner.query(`CREATE TABLE "sectores" ("id_sector" SERIAL NOT NULL, "nombre" character varying(60) NOT NULL, "id_deposito" integer NOT NULL, "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_sector_nombre_deposito" UNIQUE ("nombre", "id_deposito"), CONSTRAINT "PK_sectores" PRIMARY KEY ("id_sector"))`);
    await queryRunner.query(`CREATE TABLE "estantes" ("id_estante" SERIAL NOT NULL, "codigo" character varying(40) NOT NULL, "descripcion" character varying(160), "id_sector" integer NOT NULL, "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_estante_codigo_sector" UNIQUE ("codigo", "id_sector"), CONSTRAINT "PK_estantes" PRIMARY KEY ("id_estante"))`);
    await queryRunner.query(`CREATE TABLE "productos" ("id_producto" SERIAL NOT NULL, "sku" character varying(50) NOT NULL, "nombre" character varying(120) NOT NULL, "descripcion" text NOT NULL, "stock" integer NOT NULL DEFAULT 0, "precio_unitario" numeric(12,2) NOT NULL, "costo" numeric(12,2), "id_categoria" integer NOT NULL, "id_marca" integer NOT NULL, "id_estante" integer NOT NULL, "fecha_baja" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_productos_sku" UNIQUE ("sku"), CONSTRAINT "CHK_producto_stock" CHECK ("stock" >= 0), CONSTRAINT "CHK_producto_precio" CHECK ("precio_unitario" > 0), CONSTRAINT "CHK_producto_costo" CHECK ("costo" IS NULL OR "costo" >= 0), CONSTRAINT "PK_productos" PRIMARY KEY ("id_producto"))`);
    await queryRunner.query(`ALTER TABLE "empleados" ADD CONSTRAINT "FK_empleados_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_usuarios_rol" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_usuarios_empleado" FOREIGN KEY ("id_empleado") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "sectores" ADD CONSTRAINT "FK_sectores_deposito" FOREIGN KEY ("id_deposito") REFERENCES "depositos"("id_deposito") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "estantes" ADD CONSTRAINT "FK_estantes_sector" FOREIGN KEY ("id_sector") REFERENCES "sectores"("id_sector") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "productos" ADD CONSTRAINT "FK_productos_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "productos" ADD CONSTRAINT "FK_productos_marca" FOREIGN KEY ("id_marca") REFERENCES "marcas"("id_marca") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "productos" ADD CONSTRAINT "FK_productos_estante" FOREIGN KEY ("id_estante") REFERENCES "estantes"("id_estante") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_usuarios_nombre_lower" ON "usuarios" (LOWER("nombre"))`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE INDEX "IDX_productos_busqueda_nombre" ON "productos" USING gin ("nombre" gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX "IDX_productos_busqueda_descripcion" ON "productos" USING gin ("descripcion" gin_trgm_ops)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "productos"`);
    await queryRunner.query(`DROP TABLE "estantes"`);
    await queryRunner.query(`DROP TABLE "sectores"`);
    await queryRunner.query(`DROP TABLE "depositos"`);
    await queryRunner.query(`DROP TABLE "marcas"`);
    await queryRunner.query(`DROP TABLE "categorias"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TABLE "empleados"`);
    await queryRunner.query(`DROP TABLE "personas"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "public"."roles_nombre_enum"`);
  }
}
