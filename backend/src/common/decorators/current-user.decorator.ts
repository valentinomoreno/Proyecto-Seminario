import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado => {
    const request = context.switchToHttp().getRequest<Request & { user: UsuarioAutenticado }>();
    return request.user;
  },
);
