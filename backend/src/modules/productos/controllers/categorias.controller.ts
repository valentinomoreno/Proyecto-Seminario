import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto/catalogo.dto';
import { CategoriasService } from '../services/categorias.service';

@Controller('categorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() @Roles(NombreRol.ADMINISTRADOR) create(@Body() dto: CreateCategoriaDto) { return this.service.create(dto); }
  @Put(':id') @Roles(NombreRol.ADMINISTRADOR) update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoriaDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles(NombreRol.ADMINISTRADOR) @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
