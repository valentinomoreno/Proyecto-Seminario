import { SetMetadata } from '@nestjs/common';
import { NombreRol } from '../enums/nombre-rol.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: NombreRol[]) => SetMetadata(ROLES_KEY, roles);
