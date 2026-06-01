// Edge Function: admin-users
//
// Endpoint único para acciones sobre usuarios que requieren service_role
// (el cliente browser NUNCA debe tener service_role). Solo un admin
// autenticado puede invocarlo — verificamos su JWT y consultamos profiles.
//
// Operaciones:
//   POST { action: 'invite',          email, full_name, phone? }
//   POST { action: 'reset_password',  user_id }
//   POST { action: 'set_active',      user_id, active: boolean }
//   POST { action: 'delete',          user_id }
//
// Deploy:
//   supabase functions deploy admin-users
//
// Variables (configurar en dashboard → Edge Functions → Secrets):
//   SUPABASE_URL              (lo inyecta Supabase)
//   SUPABASE_ANON_KEY         (lo inyecta Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (lo inyecta Supabase)
//   SITE_URL                  ej. https://palentour.com (para redirect del email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SITE_URL     = Deno.env.get('SITE_URL') ?? '';

  // 1) Verificar que quien llama es un admin activo
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { error: 'Missing Authorization header' });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: 'Invalid session' });

  const { data: callerProfile, error: profErr } = await userClient
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profErr) return json(500, { error: profErr.message });
  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
    return json(403, { error: 'Forbidden: admin only' });
  }

  // 2) Parse body
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }
  const action = body?.action;
  if (!action) return json(400, { error: 'Missing action' });

  // 3) Cliente con service_role para operaciones admin
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    switch (action) {
      case 'invite': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const full_name = String(body.full_name ?? '').trim();
        const phone = body.phone ? String(body.phone).trim() : null;

        if (!email || !full_name) {
          return json(400, { error: 'email y full_name son obligatorios' });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return json(400, { error: 'Email inválido' });
        }

        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name, phone, role: 'member' },
          redirectTo: SITE_URL ? `${SITE_URL}/reset-password` : undefined,
        });
        if (error) return json(400, { error: error.message });

        return json(200, { ok: true, user_id: data.user?.id });
      }

      case 'reset_password': {
        const user_id = String(body.user_id ?? '');
        if (!user_id) return json(400, { error: 'user_id requerido' });

        const { data: u, error: e1 } = await admin.auth.admin.getUserById(user_id);
        if (e1 || !u.user?.email) return json(404, { error: 'Usuario no encontrado' });

        // generateLink crea un magic link de tipo recovery sin enviar email automático.
        // Como queremos que llegue el email, usamos resetPasswordForEmail con el email obtenido.
        const { error } = await admin.auth.resetPasswordForEmail(u.user.email, {
          redirectTo: SITE_URL ? `${SITE_URL}/reset-password` : undefined,
        });
        if (error) return json(400, { error: error.message });

        return json(200, { ok: true });
      }

      case 'set_active': {
        const user_id = String(body.user_id ?? '');
        const active = Boolean(body.active);
        if (!user_id) return json(400, { error: 'user_id requerido' });

        // Actualizamos profiles.active (RLS lo permite porque vamos con service_role).
        const { error } = await admin
          .from('profiles')
          .update({ active })
          .eq('id', user_id);
        if (error) return json(400, { error: error.message });

        // Si se desactiva, revocamos sesiones activas para forzar logout.
        if (!active) {
          await admin.auth.admin.signOut(user_id).catch(() => {});
        }
        return json(200, { ok: true });
      }

      case 'delete': {
        const user_id = String(body.user_id ?? '');
        if (!user_id) return json(400, { error: 'user_id requerido' });
        if (user_id === userData.user.id) {
          return json(400, { error: 'No puedes eliminar tu propia cuenta' });
        }

        // Borrar de auth.users dispara cascade a profiles y bookings.
        const { error } = await admin.auth.admin.deleteUser(user_id);
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true });
      }

      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
