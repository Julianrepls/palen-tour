import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Mountain, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Solicitud de recuperación de contraseña.
 *
 * Llama directo a supabase.auth.resetPasswordForEmail desde el cliente — no
 * necesita Edge Function porque cualquier usuario puede pedir reset de su
 * propio email. Supabase rate-limita por IP automáticamente.
 *
 * Por seguridad NO confirmamos si el email existe o no: siempre mostramos el
 * mismo mensaje. De lo contrario el endpoint sería un user-enumeration oracle.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    // Solo mostramos error en condiciones que no revelen si el email existe
    // (errores de red, rate limit, etc.). Para "user not found" no avisamos.
    if (error && !/user|not found|email/i.test(error.message)) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-primary-700">
          <Mountain className="w-7 h-7 text-primary-600" />
          <span className="font-bold text-xl">Palen Tour</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
            <p className="text-sm text-gray-500 mb-6">
              Si <strong>{email}</strong> está asociado a una cuenta, recibirás un email con
              instrucciones para crear una nueva contraseña.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary-700 font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al login
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-700" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-gray-400 text-sm text-center mb-6">
              Te enviaremos un enlace para restablecerla.
            </p>

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
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6">
              <Link to="/login" className="inline-flex items-center gap-1 text-primary-700 font-semibold">
                <ArrowLeft className="w-3 h-3" /> Volver al login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
