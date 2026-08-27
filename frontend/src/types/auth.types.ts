export type Rol = 'ADMINISTRADOR' | 'EMPLEADO_VENTA';

export interface UsuarioAutenticado {
  idUsuario: number;
  nombre: string;
  rol: Rol;
  idEmpleado: number | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioAutenticado;
}
