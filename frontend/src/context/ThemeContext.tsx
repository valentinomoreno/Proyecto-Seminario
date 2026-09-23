import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('autopartes_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('autopartes_theme', theme);
      // Limpiar cualquier residuo de zoom para que el navegador use la escala natural
      (document.documentElement.style as unknown as Record<string, string>).zoom = '';
      document.documentElement.removeAttribute('data-zoom');
      localStorage.removeItem('autopartes_zoom');

      // Sincronizar barra de estado en Android e iOS
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', theme === 'dark' ? '#121316' : '#ffffff');
      }
      const metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (metaApple) {
        metaApple.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'light',
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
