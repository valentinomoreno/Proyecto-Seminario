import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { NombreRol } from '../../common/enums/nombre-rol.enum';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const getOne = jest.fn();
  const queryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne,
  };
  const repository = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as unknown as Repository<Usuario>;
  const signAsync = jest.fn().mockResolvedValue('jwt-token');
  const jwtService = { signAsync } as unknown as JwtService;
  const service = new AuthService(repository, jwtService);

  beforeEach(() => jest.clearAllMocks());

  it('valida la contraseña y retorna el payload requerido', async () => {
    const hash = await bcrypt.hash('Segura123!', 4);
    getOne.mockResolvedValue({
      idUsuario: 1,
      nombre: 'admin',
      contrasenaHash: hash,
      activo: true,
      rol: { nombre: NombreRol.ADMINISTRADOR },
      empleado: { idEmpleado: 5, activo: true },
    });

    await expect(service.login({ nombre: 'admin', contrasena: 'Segura123!' })).resolves.toEqual({
      accessToken: 'jwt-token',
      usuario: { idUsuario: 1, nombre: 'admin', rol: NombreRol.ADMINISTRADOR, idEmpleado: 5 },
    });
    expect(signAsync).toHaveBeenCalledWith(expect.objectContaining({ idUsuario: 1, idEmpleado: 5 }));
  });

  it('rechaza credenciales incorrectas con un mensaje amigable', async () => {
    getOne.mockResolvedValue(null);
    await expect(service.login({ nombre: 'nadie', contrasena: 'incorrecta' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
