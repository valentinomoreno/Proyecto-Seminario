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
import {
  CreateClienteEmpresaDto,
  CreateClientePersonaDto,
  QueryClientesDto,
  UpdateClienteDto,
} from '../dto/cliente.dto';
import { ClientesService } from '../services/clientes.service';

const ROLES_OPERATIVOS = [NombreRol.ADMINISTRADOR, NombreRol.EMPLEADO_VENTA];

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @Roles(...ROLES_OPERATIVOS)
  findAll(@Query() query: QueryClientesDto) { return this.service.findAll(query); }

  @Get(':id')
  @Roles(...ROLES_OPERATIVOS)
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post('persona')
  @Roles(...ROLES_OPERATIVOS)
  createPersona(@Body() dto: CreateClientePersonaDto) { return this.service.createPersona(dto); }

  @Post('empresa')
  @Roles(...ROLES_OPERATIVOS)
  createEmpresa(@Body() dto: CreateClienteEmpresaDto) { return this.service.createEmpresa(dto); }

  @Put(':id')
  @Roles(...ROLES_OPERATIVOS)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(NombreRol.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
