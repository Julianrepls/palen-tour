import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Star, ArrowRight } from 'lucide-react';
import TripCard from '../components/TripCard';
import { supabase, TRIP_VIEW_SELECT, TRIPS_VIEW } from '../lib/supabase';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from(TRIPS_VIEW)
        .select(TRIP_VIEW_SELECT)
        .order('date', { ascending: true })
        .limit(3);
      if (!error) setFeatured(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative min-h-[90vh] flex items-center justify-center text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-center px-4 max-w-3xl mx-auto">
          <span className="inline-block bg-primary-600/80 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            ¡Viajes en grupo para todos!
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg">
            Descubre el mundo con <span className="text-primary-300">Palen Tour</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 mb-10 leading-relaxed">
            Organizamos excursiones y viajes en grupo para personas que quieren vivir aventuras únicas. Montaña, mar, naturaleza — tú eliges, nosotros organizamos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/viajes"
              className="bg-primary-600 text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-primary-700 transition-colors shadow-lg"
            >
              Ver todos los viajes
            </Link>
            <Link
              to="/nosotros"
              className="bg-white/20 text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/30"
            >
              Conoce el equipo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary-700 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '+500', label: 'Viajeros felices' },
            { value: '+80', label: 'Excursiones realizadas' },
            { value: '5★', label: 'Valoración media' },
            { value: '100%', label: 'Seguro de viaje incluido' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-extrabold text-primary-200">{stat.value}</div>
              <div className="text-sm text-primary-100 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured trips */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Próximos viajes</h2>
            <p className="text-gray-500 mt-1">No te quedes sin plaza — reserva con antelación</p>
          </div>
          <Link to="/viajes" className="hidden sm:flex items-center gap-1 text-primary-700 font-semibold hover:gap-2 transition-all">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando viajes...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featured.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
        <div className="mt-8 text-center sm:hidden">
          <Link to="/viajes" className="inline-flex items-center gap-1 text-primary-700 font-semibold">
            Ver todos los viajes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-primary-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">¿Por qué elegir Palen Tour?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Llevamos años organizando experiencias que las personas no olvidan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8 text-primary-600" />,
                title: 'Grupos pequeños',
                desc: 'Máximo 25 personas por grupo para que la experiencia sea íntima y personalizada.',
              },
              {
                icon: <Shield className="w-8 h-8 text-primary-600" />,
                title: 'Todo incluido',
                desc: 'Transporte, alojamiento, guías y seguros. Tú solo necesitas apuntarte y disfrutar.',
              },
              {
                icon: <Star className="w-8 h-8 text-primary-600" />,
                title: 'Guías expertos',
                desc: 'Nuestros guías son locales certificados con amplio conocimiento de cada destino.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <div className="flex justify-center mb-4">{item.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">¿Cómo funciona?</h2>
          <p className="text-gray-500">En tres pasos estás en la aventura</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Elige tu viaje', desc: 'Explora nuestro catálogo y encuentra la excursión que más te apetece.' },
            { step: '02', title: 'Inscríbete online', desc: 'Rellena el formulario de inscripción en menos de 2 minutos desde tu móvil o PC.' },
            { step: '03', title: '¡A disfrutar!', desc: 'Nosotros nos encargamos de todo. Solo tienes que aparecer con las ganas.' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center font-extrabold text-xl mb-4 shadow-lg">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary-700 text-white py-16 mx-4 sm:mx-6 rounded-3xl mb-20 max-w-6xl md:mx-auto px-6 text-center">
        <h2 className="text-3xl font-extrabold mb-3">¿Listo para tu próxima aventura?</h2>
        <p className="text-primary-200 mb-8 text-lg">Plazas limitadas. ¡No te quedes fuera!</p>
        <Link
          to="/viajes"
          className="bg-white text-primary-700 font-bold px-8 py-4 rounded-full text-lg hover:bg-primary-50 transition-colors inline-block"
        >
          Reserva tu plaza ahora
        </Link>
      </section>
    </div>
  );
}
