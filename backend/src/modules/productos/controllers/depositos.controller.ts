import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateDepositoDto, UpdateDepositoDto } from '../dto/catalogo.dto';
import { DepositosService } from '../services/depositos.service';

@Controller('depositos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositosController {
  constructor(private readonly service: DepositosService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() @Roles(NombreRol.ADMINISTRADOR) create(@Body() dto: CreateDepositoDto) { return this.service.create(dto); }
  @Put(':id') @Roles(NombreRol.ADMINISTRADOR) update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepositoDto) { return this.service.update(id, dto); }
  @Delete(':id') @Roles(NombreRol.ADMINISTRADOR) @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
