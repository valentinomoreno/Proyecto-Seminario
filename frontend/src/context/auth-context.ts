import { createContext } from 'react';
import type { UsuarioAutenticado } from '../types/auth.types';

export interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  autenticado: boolean;
  login: (nombre: string, contrasena: string) => Promise<UsuarioAutenticado>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
