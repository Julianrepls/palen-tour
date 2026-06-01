import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, MapPin, Calendar } from 'lucide-react';
import { supabase, TRIP_VIEW_SELECT, TRIPS_VIEW, TRIPS_TABLE } from '../../lib/supabase';
import { difficultyColor } from '../../data/trips';
import TripForm from './TripForm';

export default function TripsManager() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = nothing | {} new | trip object edit
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TRIPS_VIEW)
      .select(TRIP_VIEW_SELECT)
      .order('date', { ascending: true });
    if (error) setError(error.message);
    else setTrips(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  const handleDelete = async (trip) => {
    if (!window.confirm(`¿Eliminar el viaje "${trip.title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from(TRIPS_TABLE).delete().eq('id', trip.id);
    if (error) {
      // Probable: violación de FK porque hay bookings asociados
      alert(
        error.message.includes('violates foreign key')
          ? 'No se puede eliminar: hay inscripciones asociadas a este viaje. Elimina o reasigna primero las inscripciones.'
          : 'Error al eliminar: ' + error.message
      );
      return;
    }
    load();
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {loading ? 'Cargando...' : `${trips.length} ${trips.length === 1 ? 'viaje' : 'viajes'} en catálogo`}
        </p>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-2 bg-primary-600 text-white font-semibold px-4 py-2.5 rounded-full text-sm hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo viaje
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-6 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <h3 className="text-gray-500 font-semibold text-lg mb-1">Aún no hay viajes</h3>
          <p className="text-gray-400 text-sm">Crea el primero con el botón "Nuevo viaje".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
              <div
                className="w-32 flex-shrink-0 bg-gray-100"
                style={t.image ? { backgroundImage: `url(${t.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              />
              <div className="flex-1 p-4 flex flex-col min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug truncate flex-1" title={t.title}>{t.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${difficultyColor[t.difficulty]}`}>
                    {t.difficulty}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3" /> {t.location}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                  <Calendar className="w-3 h-3" /> {formatDate(t.date)} → {formatDate(t.returnDate)}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                  <div className="text-xs text-gray-500">
                    <span className="font-bold text-primary-700">{t.price}€</span>
                    <span className="mx-1">·</span>
                    {t.spotsLeft}/{t.spots} libres
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <TripForm
          trip={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
