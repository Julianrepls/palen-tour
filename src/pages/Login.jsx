import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mountain } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

/**
 * Login unificado para admin y miembros.
 * Tras autenticar, redirige según rol:
 *   - admin  -> /admin
 *   - member -> /mi-cuenta (o la ruta original si venía de un ProtectedRoute)
 */
export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error, profile } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error.message || 'Credenciales inválidas');
      return;
    }
    if (from && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }
    navigate(profile?.role === 'admin' ? '/admin' : '/mi-cuenta', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-primary-700">
          <Mountain className="w-7 h-7 text-primary-600" />
          <span className="font-bold text-xl">Palen Tour</span>
        </Link>

        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary-700" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Iniciar sesión</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Accede a tu cuenta de miembro</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white font-bold py-3 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          ¿Olvidaste tu contraseña?{' '}
          <Link to="/forgot-password" className="text-primary-700 font-semibold">
            Recupérala
          </Link>
        </p>
        <p className="text-sm text-gray-500 text-center mt-2">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-primary-700 font-semibold">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
