import { createContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

/**
 * AuthProvider: estado global de sesión + perfil.
 *
 * - session: el JWT/sesión que mantiene Supabase (persistido en localStorage por la lib).
 * - profile: fila de public.profiles del usuario actual (incluye role, active, full_name).
 * - status: 'loading' | 'authenticated' | 'unauthenticated'.
 *
 * El profile se carga vía RLS: la policy "profiles_self_select" garantiza que solo
 * recibe su propia fila. Si no hay sesión, profile = null.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, active')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      setProfile(null);
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const s = data.session;
      setSession(s);
      if (s) await loadProfile(s.user.id);
      setStatus(s ? 'authenticated' : 'unauthenticated');
    });

    // IMPORTANTE: onAuthStateChange mantiene un lock interno mientras corre el callback.
    // Si haces `await supabase.from(...)` aquí dentro, el cliente queda bloqueado y la
    // query nunca resuelve. Diferimos el side-effect con setTimeout(0) para soltar el lock.
    // Ref: https://github.com/supabase/auth-js/issues/762
    //
    // status refleja la sesión inmediatamente. El profile se carga en background
    // (puede quedar null brevemente). ProtectedRoute distingue ambos estados.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s) {
        setStatus('authenticated');
        setTimeout(() => {
          if (mounted) loadProfile(s.user.id);
        }, 0);
      } else {
        setProfile(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    // Profile cargado aquí síncronamente para que el caller pueda redirigir por rol
    // sin esperar el siguiente render del contexto.
    const p = await loadProfile(data.user.id);
    if (p && !p.active) {
      await supabase.auth.signOut();
      return { error: { message: 'Cuenta desactivada. Contacta con el administrador.' } };
    }
    // Garantiza que status='authenticated' antes de que el caller navegue. Sin esto,
    // ProtectedRoute podría leer status='unauthenticated' y redirigir a /login.
    setStatus('authenticated');
    return { data, profile: p };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    status,
    isAuthenticated: status === 'authenticated',
    isAdmin: profile?.role === 'admin' && profile?.active === true,
    isMember: profile?.role === 'member' && profile?.active === true,
    signIn,
    signOut,
    refreshProfile,
  }), [session, profile, status, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
