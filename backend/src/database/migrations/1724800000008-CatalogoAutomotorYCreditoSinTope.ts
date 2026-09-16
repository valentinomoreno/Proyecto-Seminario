import { MigrationInterface, QueryRunner } from 'typeorm';

type CategoriaCatalogo = {
  nombre: string;
  descripcion: string;
  marcas: string[];
};

const CATALOGO: CategoriaCatalogo[] = [
  { nombre: 'Motor', descripcion: 'Repuestos y componentes del motor.', marcas: ['ACDelco', 'Bosch', 'Denso', 'Mahle', 'NGK'] },
  { nombre: 'Frenos', descripcion: 'Componentes del sistema de frenado.', marcas: ['ACDelco', 'Bosch', 'Ferodo', 'Fras-le', 'TRW'] },
  { nombre: 'Electricidad', descripcion: 'Componentes eléctricos y electrónicos.', marcas: ['ACDelco', 'Bosch', 'Denso', 'Magneti Marelli', 'Moura', 'NGK', 'Willard'] },
  { nombre: 'Suspensión y Dirección', descripcion: 'Amortiguación, tren delantero y dirección.', marcas: ['Corven', 'Monroe', 'Sachs', 'SKF', 'TRW'] },
  { nombre: 'Transmisión y Embrague', descripcion: 'Embragues y componentes de transmisión.', marcas: ['LuK', 'Sachs', 'SKF', 'Valeo'] },
  { nombre: 'Filtros', descripcion: 'Filtros de aceite, aire, combustible y habitáculo.', marcas: ['Bosch', 'Mahle', 'MANN-FILTER', 'Wega'] },
  { nombre: 'Lubricantes y Fluidos', descripcion: 'Aceites, refrigerantes y fluidos automotrices.', marcas: ['Castrol', 'Mobil', 'Shell', 'TotalEnergies'] },
  { nombre: 'Refrigeración', descripcion: 'Radiadores, bombas, termostatos y mangueras.', marcas: ['Dayco', 'Gates', 'Mahle', 'Valeo'] },
  { nombre: 'Escape', descripcion: 'Componentes del sistema de escape.', marcas: ['Bosch', 'Magneti Marelli', 'Walker'] },
  { nombre: 'Encendido', descripcion: 'Bujías, bobinas y componentes de encendido.', marcas: ['ACDelco', 'Bosch', 'Denso', 'Magneti Marelli', 'NGK'] },
  { nombre: 'Iluminación', descripcion: 'Lámparas, ópticas y señalización.', marcas: ['Bosch', 'Magneti Marelli', 'Osram', 'Philips'] },
  { nombre: 'Carrocería', descripcion: 'Espejos, cerraduras y piezas de carrocería.', marcas: ['Magneti Marelli', 'Valeo'] },
  { nombre: 'Rodamientos y Retenes', descripcion: 'Rodamientos, mazas y retenes.', marcas: ['FAG', 'SKF', 'Timken'] },
  { nombre: 'Correas y Distribución', descripcion: 'Correas, tensores y kits de distribución.', marcas: ['Continental', 'Dayco', 'Gates', 'SKF'] },
  { nombre: 'Accesorios', descripcion: 'Accesorios y equipamiento para el vehículo.', marcas: ['Bosch', 'Osram', 'Philips'] },
];

export class CatalogoAutomotorYCreditoSinTope1724800000008 implements MigrationInterface {
  name = 'CatalogoAutomotorYCreditoSinTope1724800000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categorias_marcas" (
        "id_categoria" integer NOT NULL,
        "id_marca" integer NOT NULL,
        CONSTRAINT "PK_categorias_marcas" PRIMARY KEY ("id_categoria", "id_marca"),
        CONSTRAINT "FK_categorias_marcas_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE CASCADE,
        CONSTRAINT "FK_categorias_marcas_marca" FOREIGN KEY ("id_marca") REFERENCES "marcas"("id_marca") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_categorias_marcas_marca" ON "categorias_marcas" ("id_marca")');

    for (const categoria of CATALOGO) {
      await queryRunner.query(
        `INSERT INTO "categorias" ("nombre", "descripcion") VALUES ($1, $2)
         ON CONFLICT ("nombre") DO UPDATE SET "descripcion" = EXCLUDED."descripcion", "fecha_baja" = NULL`,
        [categoria.nombre, categoria.descripcion],
      );
      for (const marca of categoria.marcas) {
        await queryRunner.query(
          `INSERT INTO "marcas" ("nombre") VALUES ($1)
           ON CONFLICT ("nombre") DO UPDATE SET "fecha_baja" = NULL`,
          [marca],
        );
        await queryRunner.query(
          `INSERT INTO "categorias_marcas" ("id_categoria", "id_marca")
           SELECT categoria."id_categoria", marca."id_marca"
           FROM "categorias" categoria, "marcas" marca
           WHERE categoria."nombre" = $1 AND marca."nombre" = $2
           ON CONFLICT DO NOTHING`,
          [categoria.nombre, marca],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_categorias_marcas_marca"');
    await queryRunner.query('DROP TABLE "categorias_marcas"');
  }
}
