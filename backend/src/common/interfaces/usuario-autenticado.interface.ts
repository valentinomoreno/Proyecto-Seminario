import { NombreRol } from '../enums/nombre-rol.enum';

export interface UsuarioAutenticado {
  idUsuario: number;
  nombre: string;
  rol: NombreRol;
  idEmpleado: number | null;
}
