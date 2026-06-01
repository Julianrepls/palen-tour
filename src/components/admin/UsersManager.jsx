import { useEffect, useState } from 'react';
import {
  UserPlus, Mail, KeyRound, Power, Trash2, Search, X, Shield, User as UserIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/useAuth';

/**
 * Tab de gestión de miembros del panel admin.
 *
 * - Listado: lee public.profiles (RLS permite SELECT a admin).
 * - Edición simple (nombre/teléfono/role): UPDATE directo (RLS permite a admin).
 * - Acciones que requieren service_role (invitar, reset password, desactivar, borrar):
 *   van por la Edge Function `admin-users`.
 */
export default function UsersManager() {
  const { session, profile: currentProfile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState(null);

  const flash = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, active, created_at')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Llama a la Edge Function admin-users
  const callAdminFn = async (action, payload) => {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action, ...payload },
    });
    if (error) {
      // Las funciones devuelven 4xx con { error }. Intentamos extraerlo.
      let msg = error.message;
      try {
        const ctx = error.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        }
      } catch { /* noop */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleInvite = async ({ email, full_name, phone }) => {
    await callAdminFn('invite', { email, full_name, phone });
    flash('ok', `Invitación enviada a ${email}`);
    setShowInvite(false);
    await load();
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`¿Enviar email de reset a ${user.email}?`)) return;
    try {
      await callAdminFn('reset_password', { user_id: user.id });
      flash('ok', `Email de reset enviado a ${user.email}`);
    } catch (e) {
      flash('error', e.message);
    }
  };

  const handleToggleActive = async (user) => {
    const verb = user.active ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿Seguro que quieres ${verb} a ${user.full_name || user.email}?`)) return;
    try {
      await callAdminFn('set_active', { user_id: user.id, active: !user.active });
      flash('ok', `Usuario ${user.active ? 'desactivado' : 'reactivado'}`);
      await load();
    } catch (e) {
      flash('error', e.message);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentProfile?.id) {
      flash('error', 'No puedes eliminar tu propia cuenta');
      return;
    }
    if (!window.confirm(
      `¿Eliminar definitivamente a ${user.full_name || user.email}?\n\n` +
      'Esto borrará también sus inscripciones. No se puede deshacer.'
    )) return;
    try {
      await callAdminFn('delete', { user_id: user.id });
      flash('ok', 'Usuario eliminado');
      await load();
    } catch (e) {
      flash('error', e.message);
    }
  };

  const handleSaveEdit = async (patch) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: patch.full_name,
        phone: patch.phone || null,
        role: patch.role,
      })
      .eq('id', editing.id);
    if (error) {
      flash('error', error.message);
      return;
    }
    flash('ok', 'Cambios guardados');
    setEditing(null);
    await load();
  };

  const filtered = members.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: members.length,
    active: members.filter((m) => m.active).length,
    admins: members.filter((m) => m.role === 'admin').length,
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
            toast.kind === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total miembros', value: stats.total, color: 'text-primary-700' },
          { label: 'Activos', value: stats.active, color: 'text-green-600' },
          { label: 'Admins', value: stats.admins, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-primary-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invitar miembro
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando miembros...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-500 font-semibold text-lg">
            {query ? 'Sin resultados' : 'Aún no hay miembros'}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {query ? 'Prueba con otro término.' : 'Invita al primero con el botón de arriba.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  {['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditing(m)}
                        className="font-medium text-gray-900 hover:text-primary-700 transition-colors text-left"
                      >
                        {m.full_name || '—'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.email}</td>
                    <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {m.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        m.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {m.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <IconButton title="Reset password" onClick={() => handleResetPassword(m)}>
                          <KeyRound className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          title={m.active ? 'Desactivar' : 'Reactivar'}
                          onClick={() => handleToggleActive(m)}
                          className={m.active ? 'text-yellow-600' : 'text-green-600'}
                        >
                          <Power className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          title="Eliminar"
                          onClick={() => handleDelete(m)}
                          className="text-red-500 hover:text-red-700"
                          disabled={m.id === currentProfile?.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSubmit={handleInvite}
        />
      )}

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleSaveEdit}
        />
      )}
    </div>
  );
}

function IconButton({ children, className = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function InviteModal({ onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ email: email.trim(), full_name: fullName.trim(), phone: phone.trim() });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Invitar nuevo miembro" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre completo" required>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </Field>

        <p className="text-xs text-gray-400 flex items-start gap-2">
          <Mail className="w-4 h-4 mt-0.5 shrink-0" />
          Se enviará un email con un enlace para que el miembro fije su contraseña.
        </p>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enviando...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ user, onClose, onSubmit }) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ full_name: fullName.trim(), phone: phone.trim(), role });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Editar miembro" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar.</p>
        </Field>
        <Field label="Nombre completo" required>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </Field>
        <Field label="Rol">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="member">Miembro</option>
            <option value="admin">Admin</option>
          </select>
        </Field>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
