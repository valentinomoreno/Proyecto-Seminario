import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from './entities/empleado.entity';
import { Persona } from './entities/persona.entity';
import { Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, Usuario, Empleado, Persona])],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
