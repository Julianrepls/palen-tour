import { Link } from 'react-router-dom';
import { Heart, Compass, Leaf } from 'lucide-react';

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section
        className="relative h-64 flex items-center justify-center text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1551632811-561732d1e306?w=1400&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-center px-4">
          <h1 className="text-4xl font-extrabold mb-2">Quiénes somos</h1>
          <p className="text-gray-200 text-lg">La historia detrás de Palen Tour</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        {/* Story */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Nuestra historia</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            Palen Tour nació de una pasión compartida: la de un grupo de amigos que no paraban de organizar escapadas a la montaña, al mar y a destinos únicos de España y Europa. Lo que empezó como planes entre amigos se convirtió en una comunidad de viajeros que buscan experiencias auténticas en grupo.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Hoy organizamos decenas de excursiones al año, con grupos de entre 10 y 25 personas, cuidando cada detalle para que tú solo te preocupes de disfrutar.
          </p>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-10">Nuestros valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Heart className="w-8 h-8 text-primary-600" />,
                title: 'Pasión',
                desc: 'Organizamos los viajes que nosotros mismos queremos hacer. Esa energía se nota en cada detalle.',
              },
              {
                icon: <Compass className="w-8 h-8 text-primary-600" />,
                title: 'Aventura responsable',
                desc: 'Buscamos la emoción sin sacrificar la seguridad ni el respeto al entorno natural.',
              },
              {
                icon: <Leaf className="w-8 h-8 text-primary-600" />,
                title: 'Respeto al medio',
                desc: 'Trabajamos con guías locales, minimizamos el impacto ambiental y apoyamos las comunidades rurales.',
              },
            ].map((v) => (
              <div key={v.title} className="text-center bg-primary-50 rounded-2xl p-8">
                <div className="flex justify-center mb-4">{v.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-primary-700 text-white rounded-3xl py-14 px-8">
          <h2 className="text-2xl font-extrabold mb-3">¿Te unes a la próxima aventura?</h2>
          <p className="text-primary-200 mb-8">Plazas limitadas. Reserva con tiempo.</p>
          <Link
            to="/viajes"
            className="bg-white text-primary-700 font-bold px-8 py-3.5 rounded-full hover:bg-primary-50 transition-colors"
          >
            Ver viajes disponibles
          </Link>
        </section>
      </div>
    </div>
  );
}
