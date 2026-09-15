import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasController } from './controllers/categorias.controller';
import { DepositosController } from './controllers/depositos.controller';
import { EstantesController } from './controllers/estantes.controller';
import { MarcasController } from './controllers/marcas.controller';
import { ProductosController } from './controllers/productos.controller';
import { SectoresController } from './controllers/sectores.controller';
import { Categoria } from './entities/categoria.entity';
import { Deposito } from './entities/deposito.entity';
import { Estante } from './entities/estante.entity';
import { Marca } from './entities/marca.entity';
import { Producto } from './entities/producto.entity';
import { Sector } from './entities/sector.entity';
import { CATEGORIAS_REPOSITORY } from './repositories/interfaces/categorias-repository.interface';
import { DEPOSITOS_REPOSITORY } from './repositories/interfaces/depositos-repository.interface';
import { ESTANTES_REPOSITORY } from './repositories/interfaces/estantes-repository.interface';
import { MARCAS_REPOSITORY } from './repositories/interfaces/marcas-repository.interface';
import { PRODUCTOS_REPOSITORY } from './repositories/interfaces/productos-repository.interface';
import { SECTORES_REPOSITORY } from './repositories/interfaces/sectores-repository.interface';
import { TypeOrmCategoriasRepository } from './repositories/typeorm-categorias.repository';
import { TypeOrmDepositosRepository } from './repositories/typeorm-depositos.repository';
import { TypeOrmEstantesRepository } from './repositories/typeorm-estantes.repository';
import { TypeOrmMarcasRepository } from './repositories/typeorm-marcas.repository';
import { TypeOrmProductosRepository } from './repositories/typeorm-productos.repository';
import { TypeOrmSectoresRepository } from './repositories/typeorm-sectores.repository';
import { CategoriasService } from './services/categorias.service';
import { DepositosService } from './services/depositos.service';
import { EstantesService } from './services/estantes.service';
import { MarcasService } from './services/marcas.service';
import { ProductosService } from './services/productos.service';
import { SectoresService } from './services/sectores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria, Marca, Deposito, Sector, Estante])],
  controllers: [
    ProductosController,
    CategoriasController,
    MarcasController,
    DepositosController,
    SectoresController,
    EstantesController,
  ],
  providers: [
    // Repositories wired via interface injection tokens (DIP)
    {
      provide: PRODUCTOS_REPOSITORY,
      useClass: TypeOrmProductosRepository,
    },
    {
      provide: CATEGORIAS_REPOSITORY,
      useClass: TypeOrmCategoriasRepository,
    },
    {
      provide: MARCAS_REPOSITORY,
      useClass: TypeOrmMarcasRepository,
    },
    {
      provide: DEPOSITOS_REPOSITORY,
      useClass: TypeOrmDepositosRepository,
    },
    {
      provide: SECTORES_REPOSITORY,
      useClass: TypeOrmSectoresRepository,
    },
    {
      provide: ESTANTES_REPOSITORY,
      useClass: TypeOrmEstantesRepository,
    },
    // Services
    ProductosService,
    CategoriasService,
    MarcasService,
    DepositosService,
    SectoresService,
    EstantesService,
  ],
  exports: [
    ProductosService,
    PRODUCTOS_REPOSITORY,
    CATEGORIAS_REPOSITORY,
    MARCAS_REPOSITORY,
    DEPOSITOS_REPOSITORY,
    SECTORES_REPOSITORY,
    ESTANTES_REPOSITORY,
  ],
})
export class ProductosModule {}
