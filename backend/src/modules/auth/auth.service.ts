import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UsuarioAutenticado } from '../../common/interfaces/usuario-autenticado.interface';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; usuario: UsuarioAutenticado }> {
    const usuario = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasenaHash')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .leftJoinAndSelect('usuario.empleado', 'empleado')
      .where('LOWER(usuario.nombre) = LOWER(:nombre)', { nombre: dto.nombre.trim() })
      .getOne();

    if (!usuario?.activo || !(await bcrypt.compare(dto.contrasena, usuario.contrasenaHash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    if (usuario.empleado && !usuario.empleado.activo) {
      throw new UnauthorizedException('El empleado asociado se encuentra inactivo.');
    }

    const payload: UsuarioAutenticado = {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      rol: usuario.rol.nombre,
      idEmpleado: usuario.empleado?.idEmpleado ?? null,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: payload,
    };
  }
}
