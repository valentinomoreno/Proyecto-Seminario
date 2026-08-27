import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';

export function LoginPage() {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { autenticado, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (autenticado) navigate('/catalogo', { replace: true });
  }, [autenticado, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(nombre.trim(), contrasena);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/catalogo', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-intro">
          <span className="eyebrow">Seminario Integrador · UTN</span>
          <h1>Inventario claro.<br />Atención más rápida.</h1>
          <p>Administre repuestos, stock y ubicaciones físicas desde un único lugar.</p>
          <div className="location-path"><span>Depósito</span><i>→</i><span>Sector</span><i>→</i><span>Estante</span></div>
        </div>
        <form className="login-card" onSubmit={submit}>
          <div>
            <span className="brand-mark large">AP</span>
            <h2>Bienvenido</h2>
            <p>Ingrese sus credenciales para continuar.</p>
          </div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <label>Usuario<input autoFocus autoComplete="username" value={nombre} onChange={(event) => setNombre(event.target.value)} required /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" value={contrasena} onChange={(event) => setContrasena(event.target.value)} required /></label>
          <button className="button button-primary button-block" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar al sistema'}</button>
        </form>
      </section>
    </main>
  );
}
