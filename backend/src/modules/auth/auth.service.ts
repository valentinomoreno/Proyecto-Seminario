import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UsuarioAutenticado } from '../../common/interfaces/usuario-autenticado.interface';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

/** Pre-computed hash to prevent timing-based user enumeration. */
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lg2Fh8WmKLJZwOdPnE/9qFudo06JpE.Q3YVoHNYgK6KXi';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

    if (!usuario?.activo) {
      // Always run bcrypt to prevent timing-based user enumeration
      await bcrypt.compare(dto.contrasena, DUMMY_HASH);
      this.logger.warn(`Login fallido – usuario no encontrado o inactivo: "${dto.nombre.trim()}"`);
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    if (!(await bcrypt.compare(dto.contrasena, usuario.contrasenaHash))) {
      this.logger.warn(`Login fallido – contraseña incorrecta para usuario: "${usuario.nombre}"`);
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    if (usuario.empleado && !usuario.empleado.activo) {
      this.logger.warn(`Login fallido – empleado inactivo para usuario: "${usuario.nombre}"`);
      throw new UnauthorizedException('El empleado asociado se encuentra inactivo.');
    }

    const payload: UsuarioAutenticado = {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      rol: usuario.rol.nombre,
      idEmpleado: usuario.empleado?.idEmpleado ?? null,
    };

    this.logger.log(`Login exitoso: "${usuario.nombre}" (rol: ${usuario.rol.nombre})`);

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: payload,
    };
  }
}
