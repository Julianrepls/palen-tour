-- Contador de visitas de la web.
--
-- Diseño de seguridad (coherente con el resto del proyecto: Postgres + RLS es la
-- frontera real):
--   - Cualquier visitante (anon) puede REGISTRAR una visita, pero NO puede leer
--     el contador. El registro va por la RPC `record_page_view` (security definer),
--     no por INSERT directo: así no existe policy de insert para anon y el cliente
--     nunca puede leer ni manipular filas.
--   - Solo un admin activo puede LEER las estadísticas, vía RLS (select) y vía la
--     RPC `get_visit_stats`, que además comprueba is_admin() explícitamente.

create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  path        text,
  visited_at  timestamptz not null default now()
);

create index if not exists page_views_visited_at_idx on public.page_views (visited_at);

-- =========================================================================
-- RLS: solo admin puede leer. Nadie puede insert/update/delete directo
-- (las visitas entran por la RPC security definer de abajo).
-- =========================================================================
alter table public.page_views enable row level security;

drop policy if exists "page_views_admin_select" on public.page_views;
create policy "page_views_admin_select" on public.page_views
  for select to authenticated
  using (public.is_admin());

-- =========================================================================
-- RPC: registrar una visita. Security definer => el visitante anónimo puede
-- insertar sin tener permiso directo sobre la tabla ni poder leerla.
-- =========================================================================
create or replace function public.record_page_view(p_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.page_views (path)
  values (nullif(left(coalesce(p_path, ''), 512), ''));
end $$;

revoke all on function public.record_page_view(text) from public;
grant execute on function public.record_page_view(text) to anon, authenticated;

-- =========================================================================
-- RPC: estadísticas agregadas para el panel admin. Comprueba is_admin()
-- explícitamente además de la RLS, y devuelve un único json compacto.
-- =========================================================================
create or replace function public.get_visit_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result json;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select json_build_object(
    'total',        count(*),
    'today',        count(*) filter (where visited_at >= date_trunc('day', now())),
    'last_7_days',  count(*) filter (where visited_at >= now() - interval '7 days'),
    'last_30_days', count(*) filter (where visited_at >= now() - interval '30 days')
  )
  into v_result
  from public.page_views;

  return v_result;
end $$;

revoke all on function public.get_visit_stats() from public;
grant execute on function public.get_visit_stats() to authenticated;
