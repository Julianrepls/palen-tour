import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Download, Trash2, CheckCircle, Clock, X, LogOut, Map, LayoutDashboard, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import TripsManager from '../components/admin/TripsManager';
import Dashboard from '../components/admin/Dashboard';
import UsersManager from '../components/admin/UsersManager';

/**
 * Panel admin. La protección de ruta y la carga de sesión/rol vive ahora en
 * <ProtectedRoute requireRole="admin"> dentro de App.jsx + AuthContext.
 * Este componente asume que llega aquí solo un admin autenticado.
 */
export default function Admin() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    setLoadingRegs(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, name, email, phone, people, notes, status, registered_at, trips ( title, date )')
      .order('registered_at', { ascending: false });
    if (!error) {
      setRegistrations(
        (data || []).map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          people: r.people,
          notes: r.notes,
          status: r.status,
          registeredAt: r.registered_at,
          tripTitle: r.trips?.title ?? '—',
          tripDate: r.trips?.date ?? null,
        }))
      );
    }
    setLoadingRegs(false);
  };

  const updateStatus = async (id, status) => {
    const prev = registrations;
    setRegistrations((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) {
      alert('Error al actualizar: ' + error.message);
      setRegistrations(prev);
    }
  };

  const deleteRegistration = async (id) => {
    if (!window.confirm('¿Eliminar esta inscripción?')) return;
    const prev = registrations;
    setRegistrations((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
      setRegistrations(prev);
    }
  };

  const exportCSV = () => {
    if (registrations.length === 0) return;
    const headers = ['Nombre', 'Email', 'Teléfono', 'Viaje', 'Fecha viaje', 'Personas', 'Estado', 'Inscrito el', 'Notas'];
    const rows = registrations.map((r) => [
      r.name, r.email, r.phone, r.tripTitle,
      r.tripDate ? new Date(r.tripDate).toLocaleDateString('es-ES') : '',
      r.people, r.status,
      new Date(r.registeredAt).toLocaleString('es-ES'), r.notes || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inscripciones_palentour.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" /> },
    confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <X className="w-3.5 h-3.5" /> },
  };

  const pending = registrations.filter((r) => r.status === 'pendiente').length;
  const confirmed = registrations.filter((r) => r.status === 'confirmado').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Panel de administración</h1>
          <p className="text-gray-500 text-sm mt-1">Conectado como {profile?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'bookings' && (
            <button
              onClick={exportCSV}
              disabled={registrations.length === 0}
              className="flex items-center gap-2 bg-primary-600 text-white font-semibold px-4 py-2.5 rounded-full text-sm hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-8 border-b border-gray-100">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'bookings', label: 'Inscripciones', icon: <Users className="w-4 h-4" /> },
          { id: 'trips', label: 'Viajes', icon: <Map className="w-4 h-4" /> },
          { id: 'users', label: 'Miembros', icon: <UserCog className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-primary-700 border-primary-600'
                : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' ? (
        <Dashboard />
      ) : activeTab === 'trips' ? (
        <TripsManager />
      ) : activeTab === 'users' ? (
        <UsersManager />
      ) : (
        <BookingsTab
          registrations={registrations}
          loadingRegs={loadingRegs}
          pending={pending}
          confirmed={confirmed}
          statusConfig={statusConfig}
          updateStatus={updateStatus}
          deleteRegistration={deleteRegistration}
        />
      )}
    </div>
  );
}

function BookingsTab({ registrations, loadingRegs, pending, confirmed, statusConfig, updateStatus, deleteRegistration }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Total inscripciones', value: registrations.length, color: 'text-primary-700' },
          { label: 'Pendientes', value: pending, color: 'text-yellow-600' },
          { label: 'Confirmados', value: confirmed, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {loadingRegs ? (
        <div className="text-center py-20 text-gray-400">Cargando inscripciones...</div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-500 font-semibold text-lg">Sin inscripciones todavía</h3>
          <p className="text-gray-400 text-sm mt-1">Las inscripciones aparecerán aquí cuando alguien se apunte a un viaje.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  {['Nombre', 'Email', 'Teléfono', 'Viaje', 'Fecha', 'Personas', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((r) => {
                  const sc = statusConfig[r.status] || statusConfig.pendiente;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-500">{r.email}</td>
                      <td className="px-4 py-3 text-gray-500">{r.phone}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate" title={r.tripTitle}>{r.tripTitle}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {r.tripDate
                          ? new Date(r.tripDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.people}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={r.status}
                            onChange={(e) => updateStatus(r.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                          <button
                            onClick={() => deleteRegistration(r.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
