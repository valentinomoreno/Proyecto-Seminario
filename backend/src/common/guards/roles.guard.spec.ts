import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NombreRol } from '../enums/nombre-rol.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function contextWithRole(rol: NombreRol): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
    } as unknown as ExecutionContext;
  }

  it('permite un rol autorizado', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([NombreRol.ADMINISTRADOR]) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithRole(NombreRol.ADMINISTRADOR))).toBe(true);
  });

  it('rechaza un rol no autorizado', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([NombreRol.ADMINISTRADOR]) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithRole(NombreRol.EMPLEADO_VENTA))).toBe(false);
  });
});
