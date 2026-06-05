import { useEffect, useState } from 'react';
import { ChevronDown, Users, Calendar, MapPin, CheckCircle, Clock, X, Mail, Phone, StickyNote, Eye } from 'lucide-react';
import { supabase, TRIP_VIEW_SELECT, TRIPS_VIEW } from '../../lib/supabase';

const statusMeta = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700',   icon: <CheckCircle className="w-3 h-3" /> },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-700',       icon: <X className="w-3 h-3" /> },
};

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [visits, setVisits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: b }, { data: v }] = await Promise.all([
        supabase.from(TRIPS_VIEW).select(TRIP_VIEW_SELECT).order('date', { ascending: true }),
        supabase.from('bookings')
          .select('id, trip_id, name, email, phone, people, notes, status, registered_at')
          .order('registered_at', { ascending: false }),
        supabase.rpc('get_visit_stats'),
      ]);
      setTrips(t || []);
      setBookings(b || []);
      setVisits(v || null);
      setLoading(false);
    })();
  }, []);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Cargando dashboard...</div>;
  }

  // Aggregate per trip
  const tripStats = trips.map((trip) => {
    const tripBookings = bookings.filter((b) => b.trip_id === trip.id);
    const active = tripBookings.filter((b) => b.status !== 'cancelado');
    const totalPeople = active.reduce((sum, b) => sum + (b.people || 0), 0);
    const byStatus = {
      pendiente:  tripBookings.filter((b) => b.status === 'pendiente').length,
      confirmado: tripBookings.filter((b) => b.status === 'confirmado').length,
      cancelado:  tripBookings.filter((b) => b.status === 'cancelado').length,
    };
    const occupancy = trip.spots > 0 ? Math.min(100, Math.round((totalPeople / trip.spots) * 100)) : 0;
    return { trip, bookings: tripBookings, totalPeople, byStatus, occupancy };
  });

  // Global stats
  const totalBookings = bookings.length;
  const totalPeople = bookings.filter((b) => b.status !== 'cancelado').reduce((s, b) => s + (b.people || 0), 0);
  const tripsWithBookings = tripStats.filter((s) => s.bookings.length > 0).length;

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateTime = (d) => new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Visitas a la web (solo visible para el admin) */}
      {visits && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-primary-600" />
            <h3 className="font-bold text-gray-900 text-sm">Visitas a la web</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VisitStat label="Total" value={visits.total} color="text-primary-700" />
            <VisitStat label="Hoy" value={visits.today} color="text-green-600" />
            <VisitStat label="Últimos 7 días" value={visits.last_7_days} color="text-blue-600" />
            <VisitStat label="Últimos 30 días" value={visits.last_30_days} color="text-purple-600" />
          </div>
        </div>
      )}

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Viajes activos" value={trips.length} color="text-primary-700" />
        <StatCard label="Con inscripciones" value={tripsWithBookings} color="text-blue-600" />
        <StatCard label="Inscripciones totales" value={totalBookings} color="text-purple-600" />
        <StatCard label="Personas (no canceladas)" value={totalPeople} color="text-green-600" />
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <h3 className="text-gray-500 font-semibold text-lg mb-1">Aún no hay viajes</h3>
          <p className="text-gray-400 text-sm">Crea el primero desde la pestaña "Viajes".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tripStats.map(({ trip, bookings: bs, totalPeople, byStatus, occupancy }) => {
            const isOpen = expanded.has(trip.id);
            return (
              <div key={trip.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggle(trip.id)}
                  className="w-full text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className="w-20 h-20 rounded-xl flex-shrink-0 bg-gray-100"
                      style={trip.image ? { backgroundImage: `url(${trip.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{trip.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(trip.date)}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {totalPeople} / {trip.spots} personas</span>
                      </div>

                      {/* Occupancy bar */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full transition-all ${
                              occupancy >= 90 ? 'bg-red-500' :
                              occupancy >= 60 ? 'bg-yellow-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-500">{occupancy}%</span>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="hidden sm:flex flex-col items-end gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge {...statusMeta.confirmado} count={byStatus.confirmado} />
                        <Badge {...statusMeta.pendiente}  count={byStatus.pendiente} />
                        {byStatus.cancelado > 0 && <Badge {...statusMeta.cancelado} count={byStatus.cancelado} />}
                      </div>
                      <span className="text-gray-400">{bs.length} {bs.length === 1 ? 'inscripción' : 'inscripciones'}</span>
                    </div>

                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {bs.length === 0 ? (
                      <div className="text-center py-10">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Nadie se ha inscrito todavía a este viaje.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {bs.map((b) => {
                          const sm = statusMeta[b.status] || statusMeta.pendiente;
                          return (
                            <li key={b.id} className="p-4 hover:bg-white transition-colors">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">{b.name}</span>
                                    <span className="text-xs text-gray-400">·</span>
                                    <span className="text-xs text-gray-500">{b.people} {b.people === 1 ? 'persona' : 'personas'}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                    <a href={`mailto:${b.email}`} className="flex items-center gap-1 hover:text-primary-700">
                                      <Mail className="w-3 h-3" /> {b.email}
                                    </a>
                                    <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:text-primary-700">
                                      <Phone className="w-3 h-3" /> {b.phone}
                                    </a>
                                    <span className="text-gray-400">Inscrito el {formatDateTime(b.registered_at)}</span>
                                  </div>
                                  {b.notes && (
                                    <div className="mt-2 text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg p-2 flex items-start gap-1.5">
                                      <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-600" />
                                      {b.notes}
                                    </div>
                                  )}
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sm.color}`}>
                                  {sm.icon} {sm.label}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VisitStat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-3xl font-extrabold ${color}`}>{value ?? 0}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
      <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function Badge({ label, color, icon, count }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {icon} {count}
    </span>
  );
}
