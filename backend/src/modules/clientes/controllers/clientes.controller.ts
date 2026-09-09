import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { NombreRol } from '../../../common/enums/nombre-rol.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateClienteDto, QueryClientesDto, UpdateClienteDto } from '../dto/cliente.dto';
import { ClientesService } from '../services/clientes.service';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  findAll(@Query() query: QueryClientesDto) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  create(@Body() dto: CreateClienteDto) { return this.service.create(dto); }

  @Put(':id')
  @Roles(NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
