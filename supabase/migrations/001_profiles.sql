-- Profiles: 1-1 con auth.users. Reemplaza la tabla `admins` por un sistema de roles.
-- Cada usuario de auth.users tiene una fila aquí. El role determina permisos.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  phone       text,
  role        text not null default 'member' check (role in ('admin', 'member')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx   on public.profiles (role);
create index if not exists profiles_active_idx on public.profiles (active);

-- Auto-update updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Helper: ¿el usuario actual es admin activo? Usado en RLS de otras tablas.
-- SECURITY DEFINER + STABLE para evitar recursión en policies de profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

-- Trigger: cuando se confirma un nuevo auth.user, crea su profile.
-- raw_user_meta_data debe traer full_name y phone (lo envía la Edge Function al invitar).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'member')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Migración de admins existentes a profiles con role='admin'.
-- Asume que `admins` tiene columna user_id apuntando a auth.users.id.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='admins') then
    insert into public.profiles (id, email, full_name, role)
    select u.id, u.email, coalesce(u.email, 'Admin'), 'admin'
    from public.admins a
    join auth.users u on u.id = a.user_id
    on conflict (id) do update set role = 'admin';
  end if;
end $$;
