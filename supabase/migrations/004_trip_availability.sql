-- Disponibilidad calculada (no desnormalizada). Sustituye al uso directo de spots_left.
-- Mantenemos la columna spots_left existente para compatibilidad pero la app debe
-- migrar a leer de esta vista.

create or replace view public.trips_with_availability as
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

-- Permitir lectura pública de la vista
grant select on public.trips_with_availability to anon, authenticated;

-- RPC atómica para inscribirse: valida cupos dentro de la transacción.
-- Evita race conditions con SELECT ... FOR UPDATE sobre la fila del trip.
create or replace function public.register_to_trip(
  p_trip_id   bigint,
  p_people    int default 1,
  p_notes     text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_profile   public.profiles%rowtype;
  v_trip      public.trips%rowtype;
  v_enrolled  int;
  v_booking   public.bookings;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_people < 1 then
    raise exception 'people debe ser >= 1' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or not v_profile.active then
    raise exception 'Perfil inactivo o inexistente' using errcode = '42501';
  end if;

  -- Lock fila del trip para evitar sobrecupo concurrente
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'Viaje no encontrado' using errcode = 'P0002';
  end if;

  select coalesce(sum(people), 0) into v_enrolled
  from public.bookings
  where trip_id = p_trip_id and status in ('pendiente', 'confirmado');

  if v_enrolled + p_people > v_trip.spots then
    raise exception 'Sin cupos disponibles' using errcode = 'P0001';
  end if;

  insert into public.bookings (trip_id, user_id, name, email, phone, people, notes, status)
  values (
    p_trip_id, v_user_id,
    v_profile.full_name, v_profile.email, v_profile.phone,
    p_people, p_notes, 'pendiente'
  )
  returning * into v_booking;

  return v_booking;
end $$;

revoke all on function public.register_to_trip(bigint, int, text) from public;
grant execute on function public.register_to_trip(bigint, int, text) to authenticated;
