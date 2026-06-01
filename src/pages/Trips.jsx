import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import TripCard from '../components/TripCard';
import { categories } from '../data/trips';
import { supabase, TRIP_VIEW_SELECT, TRIPS_VIEW } from '../lib/supabase';

export default function Trips() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from(TRIPS_VIEW)
        .select(TRIP_VIEW_SELECT)
        .order('date', { ascending: true });
      if (error) setError(error.message);
      else setTrips(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = trips.filter((trip) => {
    const matchCat = activeCategory === 'todos' || trip.category === activeCategory;
    const matchSearch =
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Nuestros viajes</h1>
        <p className="text-gray-500 text-lg">Encuentra tu próxima aventura y apúntate hoy mismo</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por destino o nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-6 text-sm">
          Error cargando viajes: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando viajes...</div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {filtered.length} {filtered.length === 1 ? 'viaje encontrado' : 'viajes encontrados'}
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏔️</div>
              <h3 className="font-bold text-gray-700 text-xl mb-2">No hay viajes con esos filtros</h3>
              <p className="text-gray-400">Prueba con otra categoría o limpia la búsqueda</p>
              <button
                onClick={() => { setActiveCategory('todos'); setSearchQuery(''); }}
                className="mt-6 bg-primary-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Ver todos los viajes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
