import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Clock, ArrowLeft, CheckCircle, AlertCircle, Shield, LogIn, X,
} from 'lucide-react';
import { difficultyColor } from '../data/trips';
import { supabase, TRIP_VIEW_SELECT, TRIPS_VIEW } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

/**
 * Detalle de viaje + inscripción.
 *
 * Inscripción restringida a miembros autenticados. El backend valida cupos
 * atomicamente con la RPC `register_to_trip` (ver migración 004), así que aquí
 * la validación es solo UX: el backend siempre es la fuente de verdad.
 */
export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile, user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const [myBooking, setMyBooking] = useState(null); // inscripción activa del user en este viaje
  const [people, setPeople] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const refresh = async () => {
    const tripPromise = supabase
      .from(TRIPS_VIEW)
      .select(TRIP_VIEW_SELECT)
      .eq('id', id)
      .maybeSingle();

    const bookingPromise = user
      ? supabase
          .from('bookings')
          .select('id, status, people, notes, registered_at')
          .eq('trip_id', id)
          .eq('user_id', user.id)
          .in('status', ['pendiente', 'confirmado'])
          .maybeSingle()
      : Promise.resolve({ data: null });

    const [{ data: tripData }, { data: bookingData }] = await Promise.all([
      tripPromise,
      bookingPromise,
    ]);

    setTrip(tripData);
    setMyBooking(bookingData);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc('register_to_trip', {
      p_trip_id: trip.id,
      p_people: Number(people),
      p_notes: notes || null,
    });
    setSubmitting(false);

    if (rpcError) {
      // Mapeamos los errcode de la RPC a mensajes UX
      const msg = rpcError.message || '';
      if (msg.includes('Sin cupos')) setError('Lo sentimos, no quedan cupos disponibles.');
      else if (msg.includes('No autenticado')) setError('Debes iniciar sesión.');
      else if (msg.includes('Perfil inactivo')) setError('Tu cuenta no está activa. Contacta con el administrador.');
      else if (msg.includes('duplicate key') || msg.includes('bookings_user_trip_active_uidx')) {
        setError('Ya estás inscrito en este viaje.');
      }
      else setError('No se pudo completar la inscripción: ' + msg);
      return;
    }

    setSuccess(true);
    await refresh();
  };

  const handleCancel = async () => {
    if (!myBooking) return;
    if (!window.confirm('¿Cancelar tu inscripción a este viaje?')) return;

    setSubmitting(true);
    const { error: updErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelado' })
      .eq('id', myBooking.id);
    setSubmitting(false);

    if (updErr) {
      setError('No se pudo cancelar: ' + updErr.message);
      return;
    }
    setMyBooking(null);
    setSuccess(false);
    await refresh();
  };

  if (loading) {
    return <div className="text-center py-32 text-gray-400">Cargando viaje...</div>;
  }

  if (!trip) {
    return (
      <div className="text-center py-32">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Viaje no encontrado</h2>
        <Link to="/viajes" className="text-primary-700 font-semibold">← Volver a viajes</Link>
      </div>
    );
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const soldOut = trip.spotsLeft <= 0;
  const maxSelectable = Math.min(trip.spotsLeft, 8);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/viajes" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-700 text-sm mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a viajes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          <div className="relative rounded-2xl overflow-hidden mb-8">
            <img src={trip.image} alt={trip.title} className="w-full h-72 object-cover" />
            <span className={`absolute top-4 left-4 text-sm font-semibold px-3 py-1 rounded-full ${difficultyColor[trip.difficulty]}`}>
              Dificultad {trip.difficulty}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{trip.title}</h1>
          <p className="text-gray-600 leading-relaxed mb-8">{trip.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: <Calendar className="w-5 h-5 text-primary-600" />, label: 'Salida', value: formatDate(trip.date) },
              { icon: <Calendar className="w-5 h-5 text-primary-600" />, label: 'Regreso', value: formatDate(trip.returnDate) },
              { icon: <Clock className="w-5 h-5 text-primary-600" />, label: 'Duración', value: trip.duration },
              { icon: <MapPin className="w-5 h-5 text-primary-600" />, label: 'Destino', value: trip.location },
              { icon: <Users className="w-5 h-5 text-primary-600" />, label: 'Plazas libres', value: `${trip.spotsLeft} de ${trip.spots}` },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                {item.icon}
                <div>
                  <div className="text-xs text-gray-400 font-medium">{item.label}</div>
                  <div className="font-semibold text-gray-800 text-sm">{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-primary-50 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-600" /> ¿Qué incluye?
            </h3>
            <ul className="space-y-2">
              {trip.included.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-lg p-6 sticky top-24">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-extrabold text-primary-700">{trip.price}€</span>
              <span className="text-gray-400 text-sm">por persona</span>
            </div>
            <p className="text-xs text-gray-400 mb-6 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Seguro de viaje incluido
            </p>

            {myBooking ? (
              <AlreadyEnrolled
                booking={myBooking}
                onCancel={handleCancel}
                submitting={submitting}
                error={error}
              />
            ) : !isAuthenticated ? (
              <LoginPrompt currentLocation={location} />
            ) : soldOut ? (
              <SoldOut />
            ) : success ? (
              <RegistrationSuccess />
            ) : (
              <RegistrationForm
                trip={trip}
                people={people}
                setPeople={setPeople}
                notes={notes}
                setNotes={setNotes}
                onSubmit={handleRegister}
                submitting={submitting}
                error={error}
                maxSelectable={maxSelectable}
                profile={profile}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPrompt({ currentLocation }) {
  return (
    <div className="text-center py-4">
      <LogIn className="w-12 h-12 text-primary-500 mx-auto mb-4" />
      <h3 className="font-bold text-gray-900 text-lg mb-2">Inicia sesión para inscribirte</h3>
      <p className="text-sm text-gray-500 mb-6">
        Solo los miembros pueden inscribirse a los viajes.
      </p>
      <Link
        to="/login"
        state={{ from: currentLocation }}
        className="inline-block bg-primary-600 text-white font-bold px-6 py-3 rounded-full hover:bg-primary-700 transition-colors"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}

function SoldOut() {
  return (
    <div className="text-center py-4">
      <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
      <h3 className="font-bold text-gray-900 text-lg mb-1">Plazas agotadas</h3>
      <p className="text-sm text-gray-500">
        Este viaje está completo. Echa un vistazo a los demás.
      </p>
      <Link
        to="/viajes"
        className="inline-block mt-4 text-primary-700 font-semibold text-sm"
      >
        Ver otros viajes
      </Link>
    </div>
  );
}

function RegistrationSuccess() {
  return (
    <div className="text-center py-6">
      <CheckCircle className="w-14 h-14 text-primary-500 mx-auto mb-4" />
      <h3 className="font-bold text-gray-900 text-xl mb-2">¡Inscripción recibida!</h3>
      <p className="text-gray-500 text-sm mb-6">
        Tu plaza queda en estado pendiente. Te confirmaremos en menos de 24h.
      </p>
      <Link
        to="/mi-cuenta"
        className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-primary-700 transition-colors"
      >
        Ver mis inscripciones
      </Link>
    </div>
  );
}

function AlreadyEnrolled({ booking, onCancel, submitting, error }) {
  const statusColor = booking.status === 'confirmado'
    ? 'bg-green-100 text-green-700'
    : 'bg-yellow-100 text-yellow-700';
  const statusLabel = booking.status === 'confirmado' ? 'Confirmada' : 'Pendiente de confirmación';

  return (
    <div>
      <div className="bg-primary-50 rounded-xl p-4 mb-4 text-center">
        <CheckCircle className="w-10 h-10 text-primary-600 mx-auto mb-2" />
        <h3 className="font-bold text-gray-900">Ya estás inscrito</h3>
        <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
        <p className="text-xs text-gray-500 mt-2">
          {booking.people} {booking.people === 1 ? 'persona' : 'personas'}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={onCancel}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 font-semibold py-2.5 rounded-full text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <X className="w-4 h-4" />
        {submitting ? 'Cancelando...' : 'Cancelar inscripción'}
      </button>

      <Link
        to="/mi-cuenta"
        className="block text-center mt-3 text-primary-700 text-sm font-semibold"
      >
        Ver todas mis inscripciones
      </Link>
    </div>
  );
}

function RegistrationForm({ trip, people, setPeople, notes, setNotes, onSubmit, submitting, error, maxSelectable, profile }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="font-bold text-gray-900 text-lg">Inscríbete ahora</h3>

      {profile && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
          <strong className="text-gray-900">{profile.full_name}</strong>
          <br />
          {profile.email}{profile.phone ? ` · ${profile.phone}` : ''}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Número de personas</label>
        <select
          value={people}
          onChange={(e) => setPeople(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Notas adicionales</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Alergias, necesidades especiales, preguntas..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      </div>

      <div className="bg-primary-50 rounded-xl p-3 text-sm text-gray-700">
        <strong>Total estimado:</strong>{' '}
        <span className="text-primary-700 font-bold">{trip.price * people}€</span>
        {' '}({people} {people === 1 ? 'persona' : 'personas'})
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary-600 text-white font-bold py-3 rounded-full hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
      >
        {submitting ? 'Enviando...' : 'Solicitar inscripción'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Recibirás confirmación en menos de 24h
      </p>
    </form>
  );
}
