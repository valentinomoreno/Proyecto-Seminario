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
import { CategoriasService } from './services/categorias.service';
import { DepositosService } from './services/depositos.service';
import { EstantesService } from './services/estantes.service';
import { MarcasService } from './services/marcas.service';
import { ProductosService } from './services/productos.service';
import { SectoresService } from './services/sectores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria, Marca, Deposito, Sector, Estante])],
  controllers: [ProductosController, CategoriasController, MarcasController, DepositosController, SectoresController, EstantesController],
  providers: [ProductosService, CategoriasService, MarcasService, DepositosService, SectoresService, EstantesService],
  exports: [ProductosService],
})
export class ProductosModule {}
