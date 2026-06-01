-- RLS: Postgres es el backend. Estas policies son la frontera de seguridad real.
-- Regla general: el cliente usa anon/authenticated key; nunca service_role en el browser.

-- =========================================================================
-- profiles
-- =========================================================================
alter table public.profiles enable row level security;

-- Usuario lee su propio perfil
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Admin lee todos los perfiles
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Usuario edita su propio perfil (excepto role/active — controlado por trigger abajo)
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin edita cualquier perfil
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bloquear self-escalation: un no-admin no puede cambiar su role ni active
create or replace function public.tg_profiles_block_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'No autorizado para modificar role/active';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_block_role_escalation on public.profiles;
create trigger profiles_block_role_escalation
  before update on public.profiles
  for each row execute function public.tg_profiles_block_role_escalation();

-- Inserts: solo via trigger handle_new_user (security definer). Negamos al cliente.
-- Deletes: solo admin (en práctica se hace via cascade desde auth.users).
drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated using (public.is_admin());

-- =========================================================================
-- trips
-- =========================================================================
alter table public.trips enable row level security;

drop policy if exists "trips_public_select" on public.trips;
create policy "trips_public_select" on public.trips
  for select to anon, authenticated using (true);

drop policy if exists "trips_admin_write" on public.trips;
create policy "trips_admin_write" on public.trips
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- bookings
-- =========================================================================
alter table public.bookings enable row level security;

-- Miembro ve sus propias inscripciones
drop policy if exists "bookings_self_select" on public.bookings;
create policy "bookings_self_select" on public.bookings
  for select to authenticated
  using (user_id = auth.uid());

-- Admin ve todas
drop policy if exists "bookings_admin_select" on public.bookings;
create policy "bookings_admin_select" on public.bookings
  for select to authenticated
  using (public.is_admin());

-- Miembro se inscribe a sí mismo. Validación de cupos en función RPC (ver 004).
-- Aquí solo limitamos que no inscriba a otros.
drop policy if exists "bookings_self_insert" on public.bookings;
create policy "bookings_self_insert" on public.bookings
  for insert to authenticated
  with check (user_id = auth.uid());

-- Miembro cancela/borra su propia inscripción
drop policy if exists "bookings_self_delete" on public.bookings;
create policy "bookings_self_delete" on public.bookings
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "bookings_self_update" on public.bookings;
create policy "bookings_self_update" on public.bookings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('pendiente', 'cancelado'));

-- Admin write total
drop policy if exists "bookings_admin_write" on public.bookings;
create policy "bookings_admin_write" on public.bookings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
