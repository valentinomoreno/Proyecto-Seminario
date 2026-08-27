import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, TOKEN_KEY, USER_KEY } from '../api/axios.instance';
import type { LoginResponse, UsuarioAutenticado } from '../types/auth.types';
import { AuthContext } from './auth-context';

function readStoredUser(): UsuarioAutenticado | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const storedUser = sessionStorage.getItem(USER_KEY);
  if (!token || !storedUser) return null;
  try {
    return JSON.parse(storedUser) as UsuarioAutenticado;
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(() => readStoredUser());

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUsuario(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (nombre: string, contrasena: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { nombre, contrasena });
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const value = useMemo(() => ({ usuario, autenticado: Boolean(usuario), login, logout }), [usuario, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
