import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
}

export const supabase = createClient(url, key);

// SELECT canónico para la vista `trips_with_availability`.
// El alias `spotsLeft:spots_remaining` mantiene el contrato del frontend:
// los componentes leen `trip.spotsLeft` y reciben el valor calculado en tiempo real
// (sumando bookings activos) en lugar de una columna desnormalizada.
export const TRIP_VIEW_SELECT =
  'id, title, description, date, returnDate:return_date, price, spots, ' +
  'spotsLeft:spots_remaining, enrolled, difficulty, duration, location, image, category, included';

export const TRIPS_VIEW = 'trips_with_availability';

// Para escrituras del admin (INSERT/UPDATE/DELETE) sobre la tabla base.
// La lectura siempre va por la vista. No incluye spots_left porque ya no existe.
export const TRIPS_TABLE = 'trips';
