import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mountain, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Registro público de nuevos miembros.
 *
 * Usa supabase.auth.signUp(). El trigger handle_new_user crea el perfil como
 * 'member' activo (ver migración 008, que NO confía el rol al cliente).
 *
 * Dos escenarios según la config de Auth del proyecto:
 *   - "Confirm email" desactivado -> signUp devuelve sesión: queda logueado.
 *   - "Confirm email" activado     -> sin sesión: mostramos "revisa tu email".
 */
export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Introduce tu nombre completo.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // El rol NO se envía: lo fija el trigger como 'member' (ver migración 008).
        data: { full_name: fullName.trim(), phone: phone.trim() || null },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message || 'No se pudo completar el registro.');
      return;
    }

    // Email ya registrado: Supabase devuelve un user con identities vacío para no
    // filtrar qué emails existen. Lo tratamos como cuenta ya existente.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('Ese email ya está registrado. Inicia sesión o recupera tu contraseña.');
      return;
    }

    if (data.session) {
      // Confirmación de email desactivada: ya tiene sesión -> a su cuenta.
      navigate('/mi-cuenta', { replace: true });
      return;
    }

    // Confirmación de email activada: debe confirmar antes de entrar.
    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-primary-700">
            <Mountain className="w-7 h-7 text-primary-600" />
            <span className="font-bold text-xl">Palen Tour</span>
          </Link>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
          <p className="text-sm text-gray-500 mb-6">
            Te hemos enviado un email a <span className="font-semibold">{email.trim()}</span> para
            confirmar tu cuenta. Ábrelo y sigue el enlace para activar tu acceso.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-primary-600 text-white font-bold py-3 rounded-full hover:bg-primary-700 transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-primary-700">
          <Mountain className="w-7 h-7 text-primary-600" />
          <span className="font-bold text-xl">Palen Tour</span>
        </Link>

        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary-700" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Crear cuenta</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Únete como miembro de Palen Tour</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-gray-600 mb-1">
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
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
            <label htmlFor="phone" className="block text-xs font-semibold text-gray-600 mb-1">
              Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres.</p>
          </div>
          <div>
            <label htmlFor="password2" className="block text-xs font-semibold text-gray-600 mb-1">
              Repite la contraseña
            </label>
            <input
              id="password2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={8}
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
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary-700 font-semibold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
