import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { difficultyColor } from '../data/trips';

export default function TripCard({ trip }) {
  const soldOut = trip.spotsLeft === 0;
  const almostFull = trip.spotsLeft <= 3 && trip.spotsLeft > 0;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <div className="relative">
        <img
          src={trip.image}
          alt={trip.title}
          className="w-full h-52 object-cover"
        />
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${difficultyColor[trip.difficulty]}`}>
          {trip.difficulty}
        </span>
        {soldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-bold px-4 py-2 rounded-full text-sm">
              Plazas agotadas
            </span>
          </div>
        )}
        {almostFull && !soldOut && (
          <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            ¡Últimas {trip.spotsLeft} plazas!
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg mb-2 leading-snug">{trip.title}</h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{trip.description}</p>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary-600" />
            {formatDate(trip.date)}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary-600" />
            {trip.duration}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary-600" />
            {trip.location}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary-600" />
            {soldOut ? 'Completo' : `${trip.spotsLeft} plazas libres`}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <span className="text-2xl font-bold text-primary-700">{trip.price}€</span>
            <span className="text-gray-400 text-xs ml-1">/ persona</span>
          </div>
          <Link
            to={`/viajes/${trip.id}`}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
              soldOut
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            Ver viaje
          </Link>
        </div>
      </div>
    </div>
  );
}
