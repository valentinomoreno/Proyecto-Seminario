import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axios.instance';
import { useAuth } from '../context/useAuth';

export function LoginPage() {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
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

  function prefillCredentials(user: string, pass: string) {
    setNombre(user);
    setContrasena(pass);
    setError('');
  }

  return (
    <div className="auth-main datta-auth-bg">
      <div className="auth-wrapper v1">
        <div className="auth-form">
          <div className="position-relative">
            {/* SHAPES ANIMADOS DE DATTA ABLE */}
            <div className="auth-bg">
              <span className="r" />
              <span className="r s" />
              <span className="r s" />
              <span className="r" />
            </div>

            <div className="card my-5 shadow-lg border-0 rounded-4">
              <div className="card-body p-4 p-sm-5">
                {/* LOGO Y TÍTULO */}
                <div className="text-center mb-4">
                  <div className="d-inline-flex align-items-center gap-2 mb-2">
                    <span className="brand-mark-datta large">AP</span>
                  </div>
                  <h4 className="fw-bold text-dark mb-1">Autopartes</h4>
                  <p className="text-muted small mb-0">Sistema de Gestión de Repuestos · UTN</p>
                </div>

                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small" role="alert">
                    <i className="ti ti-alert-circle fs-5" />
                    <div>{error}</div>
                  </div>
                )}

                <form onSubmit={submit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary" htmlFor="input-username">
                      Usuario
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0">
                        <i className="ti ti-user" />
                      </span>
                      <input
                        id="input-username"
                        type="text"
                        className="form-control border-start-0 ps-0"
                        autoFocus
                        autoComplete="username"
                        placeholder="Nombre de usuario"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary" htmlFor="input-password">
                      Contraseña
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0">
                        <i className="ti ti-lock" />
                      </span>
                      <input
                        id="input-password"
                        type={mostrarPassword ? 'text' : 'password'}
                        className="form-control border-start-0 border-end-0 ps-0"
                        autoComplete="current-password"
                        placeholder="Contraseña"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="input-group-text bg-light text-muted border-start-0"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        <i className={mostrarPassword ? 'ti ti-eye' : 'ti ti-eye-off'} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 fw-semibold shadow-sm mb-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Ingresando…</span>
                      </>
                    ) : (
                      <>
                        <span>Ingresar al sistema</span>
                        <i className="ti ti-arrow-right" />
                      </>
                    )}
                  </button>

                  {/* ACCESO RÁPIDO DE PRUEBA */}
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <span className="d-block text-muted small fw-bold text-uppercase mb-2 text-center" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                      Acceso rápido de prueba:
                    </span>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success flex-fill fw-bold"
                        onClick={() => prefillCredentials('admin', 'Admin_Seguro.2026!')}
                      >
                        👑 Admin
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary flex-fill fw-bold"
                        onClick={() => prefillCredentials('vendedor', 'Vendedor_Seguro.2026!')}
                      >
                        👤 Vendedor
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                      <i className="ti ti-shield-check text-success me-1" />
                      Autenticación segura JWT · Rate Limiting activo
                    </span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
