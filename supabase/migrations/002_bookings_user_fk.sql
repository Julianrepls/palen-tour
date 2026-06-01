-- Liga bookings a profiles. Solo miembros autenticados pueden inscribirse.
-- Hacemos user_id NOT NULL en pasos: primero nullable + backfill posible, luego enforce.

alter table public.bookings
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

-- Si hay bookings huérfanos sin user_id, los marcamos como cancelados para no romper FK
-- (decisión: preservamos histórico en lugar de borrarlos).
update public.bookings
  set status = 'cancelado'
  where user_id is null and status <> 'cancelado';

-- Evita doble inscripción al mismo viaje (independiente del estado).
-- Si se permite re-inscribirse tras cancelar, cambiar a partial unique index.
create unique index if not exists bookings_user_trip_active_uidx
  on public.bookings (user_id, trip_id)
  where status in ('pendiente', 'confirmado');

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists bookings_status_idx  on public.bookings (status);
