import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Users, CheckCircle, Clock, X, AlertCircle, History, Plane,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

/**
 * Panel del miembro: listado de inscripciones propias.
 *
 * Tabs:
 *   - upcoming: inscripciones activas (pendiente/confirmado) en viajes futuros.
 *   - past: viajes pasados (cualquier estado) o cancelados.
 *
 * RLS garantiza que el SELECT a bookings solo devuelve filas con user_id = auth.uid().
 */
export default function MyAccount() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [toast, setToast] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const flash = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id, people, notes, status, registered_at, ' +
        'trips ( id, title, date, return_date, location, image, price, difficulty )'
      )
      .order('registered_at', { ascending: false });
    if (error) setError(error.message);
    else setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleCancel = async (booking) => {
    if (!window.confirm(`¿Cancelar tu inscripción a "${booking.trips?.title}"?`)) return;
    setCancellingId(booking.id);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelado' })
      .eq('id', booking.id);
    setCancellingId(null);
    if (error) {
      flash('error', 'No se pudo cancelar: ' + error.message);
      return;
    }
    flash('ok', 'Inscripción cancelada');
    await load();
  };

  const now = new Date();
  const isFuture = (d) => d && new Date(d) >= new Date(now.toDateString());

  const upcoming = bookings.filter(
    (b) => b.trips && isFuture(b.trips.date) && b.status !== 'cancelado'
  );
  const past = bookings.filter(
    (b) => !b.trips || !isFuture(b.trips.date) || b.status === 'cancelado'
  );

  const list = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${
            toast.kind === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Mi cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">
            Hola, <strong>{profile?.full_name || profile?.email}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              Ir al panel admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Próximos viajes', value: upcoming.length, color: 'text-primary-700' },
          { label: 'Confirmados', value: upcoming.filter((b) => b.status === 'confirmado').length, color: 'text-green-600' },
          { label: 'Historial', value: past.length, color: 'text-gray-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[
          { id: 'upcoming', label: 'Próximos', icon: <Plane className="w-4 h-4" /> },
          { id: 'past', label: 'Historial', icon: <History className="w-4 h-4" /> },
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

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando inscripciones...</div>
      ) : list.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              isUpcoming={activeTab === 'upcoming'}
              onCancel={() => handleCancel(b)}
              cancelling={cancellingId === b.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ activeTab }) {
  if (activeTab === 'upcoming') {
    return (
      <div className="text-center py-20">
        <Plane className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-600 font-semibold text-lg">Aún no tienes viajes próximos</h3>
        <p className="text-gray-400 text-sm mt-1 mb-6">
          Explora nuestro catálogo y apúntate al próximo.
        </p>
        <Link
          to="/viajes"
          className="inline-block bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-primary-700 transition-colors"
        >
          Ver viajes disponibles
        </Link>
      </div>
    );
  }
  return (
    <div className="text-center py-20">
      <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-gray-600 font-semibold text-lg">Tu historial está vacío</h3>
      <p className="text-gray-400 text-sm mt-1">
        Aquí verás los viajes que ya hayas realizado o cancelado.
      </p>
    </div>
  );
}

function BookingCard({ booking, isUpcoming, onCancel, cancelling }) {
  const trip = booking.trips;
  if (!trip) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-sm text-gray-400">
        Viaje eliminado · Inscripción {booking.status}
      </div>
    );
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusConfig = {
    pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <X className="w-3 h-3" /> },
  };
  const sc = statusConfig[booking.status] || statusConfig.pendiente;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 h-40 sm:h-auto shrink-0">
          <img src={trip.image} alt={trip.title} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                to={`/viajes/${trip.id}`}
                className="font-bold text-gray-900 text-lg hover:text-primary-700 transition-colors"
              >
                {trip.title}
              </Link>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {trip.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatDate(trip.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {booking.people} {booking.people === 1 ? 'persona' : 'personas'}
                </span>
              </div>
            </div>

            <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>
              {sc.icon} {sc.label}
            </span>
          </div>

          {booking.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              <strong className="text-gray-700">Notas:</strong> {booking.notes}
            </p>
          )}

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="text-sm">
              <span className="text-gray-400">Total:</span>{' '}
              <strong className="text-primary-700">{trip.price * booking.people}€</strong>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/viajes/${trip.id}`}
                className="text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                Ver viaje
              </Link>
              {isUpcoming && booking.status !== 'cancelado' && (
                <button
                  onClick={onCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-semibold disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  {cancelling ? 'Cancelando...' : 'Cancelar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
