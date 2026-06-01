-- Limpieza técnica: borrar elementos legados ya reemplazados.
--
-- 1) Tabla `admins`: sustituida por `profiles.role = 'admin'`. La migración 001
--    ya copió los datos. El frontend ya no la consulta.
--
-- 2) Columna `trips.spots_left`: sustituida por la vista `trips_with_availability`
--    que calcula `spots_remaining` en tiempo real desde `bookings`. El frontend
--    ya lee de la vista en todos los puntos.
--
-- IMPORTANTE: aplicar SOLO después de verificar que:
--   - select count(*) from profiles where role='admin'; coincide con
--     select count(*) from admins;
--   - El frontend (Home, Trips, TripDetail, TripsManager, Dashboard) ya está
--     desplegado leyendo de trips_with_availability.

-- La vista referencia trips.* — incluye spots_left. Para poder dropear la columna
-- necesitamos recrear la vista sin esa referencia explícita (en este caso usa t.*,
-- así que la vista se queda obsoleta automáticamente; la recreamos limpia).

drop view if exists public.trips_with_availability;

alter table public.trips drop column if exists spots_left;

create view public.trips_with_availability as
select
  t.*,
  coalesce(sum(b.people) filter (where b.status in ('pendiente','confirmado')), 0)::int as enrolled,
  greatest(
    t.spots - coalesce(sum(b.people) filter (where b.status in ('pendiente','confirmado')), 0),
    0
  )::int as spots_remaining
from public.trips t
left join public.bookings b on b.trip_id = t.id
group by t.id;

grant select on public.trips_with_availability to anon, authenticated;

-- Drop tabla admins (ya migrada a profiles.role)
drop table if exists public.admins;
