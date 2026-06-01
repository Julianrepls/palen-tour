import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mountain, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Landing del email de invitación y del email de recovery.
 *
 * Supabase incluye el access_token en el hash de la URL (#access_token=...).
 * El cliente JS lo detecta automáticamente (detectSessionInUrl: true por defecto)
 * y crea una sesión. Aquí solo pedimos la nueva contraseña y la guardamos.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Esperar a que Supabase procese el hash y establezca la sesión.
    let unsub;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true);
      }
    });
    unsub = data.subscription;
    return () => unsub?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/login', { replace: true }), 2000);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">
          Validando enlace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6 text-primary-700">
          <Mountain className="w-7 h-7 text-primary-600" />
          <span className="font-bold text-xl">Palen Tour</span>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">Contraseña guardada</h1>
            <p className="text-sm text-gray-500">Redirigiendo a inicio de sesión...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary-700" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">
              Crea tu contraseña
            </h1>
            <p className="text-gray-400 text-sm text-center mb-6">
              Elige una contraseña segura para acceder a tu cuenta.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Repite la contraseña
                </label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 text-white font-bold py-3 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
