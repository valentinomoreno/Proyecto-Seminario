import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateSectorDto, UpdateSectorDto } from '../dto/catalogo.dto';
import { SectoresService } from '../services/sectores.service';

@Controller('sectores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectoresController {
  constructor(private readonly service: SectoresService) {}
  @Get() findAll(@Query('depositoId', new ParseIntPipe({ optional: true })) depositoId?: number) { return this.service.findAll(depositoId); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() @Roles(NombreRol.ADMINISTRADOR) create(@Body() dto: CreateSectorDto) { return this.service.create(dto); }
  @Put(':id') @Roles(NombreRol.ADMINISTRADOR) update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSectorDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles(NombreRol.ADMINISTRADOR) @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
