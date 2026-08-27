import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UsuarioAutenticado } from '../../common/interfaces/usuario-autenticado.interface';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario) private readonly usuariosRepository: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: UsuarioAutenticado): Promise<UsuarioAutenticado> {
    const usuario = await this.usuariosRepository.findOne({
      where: { idUsuario: payload.idUsuario, activo: true },
      relations: { rol: true, empleado: true },
    });

    if (!usuario || (usuario.empleado && !usuario.empleado.activo)) {
      throw new UnauthorizedException('La sesión ya no se encuentra habilitada.');
    }

    return {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      rol: usuario.rol.nombre,
      idEmpleado: usuario.empleado?.idEmpleado ?? null,
    };
  }
}
